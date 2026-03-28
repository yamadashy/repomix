import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const shortSha = process.env.COMMIT_SHA.slice(0, 7);
const commitMsg = process.env.COMMIT_MSG;
const runUrl = process.env.WORKFLOW_RUN_URL;
const oldBody = readFileSync(process.env.RUNNER_TEMP + '/old-comment.txt', 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Extract history JSON from existing comment (set by post-pending)
const jsonMatch = oldBody.match(/<!-- bench-history-json-start ([\s\S]*?) bench-history-json-end -->/);
let history = [];
if (jsonMatch) {
  try {
    history = JSON.parse(jsonMatch[1]);
  } catch {}
}

// Read benchmark results from artifacts
function readResult(os) {
  const file = join('results', 'bench-result-' + os, 'bench-result.json');
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function formatResult(data) {
  if (!data) return '-';
  const prSec = (data.pr / 1000).toFixed(2);
  const mainSec = (data.main / 1000).toFixed(2);
  const prIqr = (data.prIqr / 1000).toFixed(2);
  const mainIqr = (data.mainIqr / 1000).toFixed(2);
  const diff = data.pr - data.main;
  const diffSec = (diff >= 0 ? '+' : '') + (diff / 1000).toFixed(2);
  const diffPct = data.main > 0 ? (diff >= 0 ? '+' : '') + ((diff / data.main) * 100).toFixed(1) : 'N/A';
  return mainSec + 's (\u00b1' + mainIqr + 's) \u2192 ' + prSec + 's (\u00b1' + prIqr + 's) \u00b7 ' + diffSec + 's (' + diffPct + '%)';
}

const ubuntuStr = formatResult(readResult('ubuntu-latest'));
const macosStr = formatResult(readResult('macos-latest'));
const windowsStr = formatResult(readResult('windows-latest'));

// Render history section
function renderHistory(hist) {
  if (hist.length === 0) return '';
  return hist
    .map((h) => {
      const label = '<code>' + h.sha + '</code>' + (h.msg ? ' ' + h.msg : '');
      const osRows = ['ubuntu', 'macos', 'windows']
        .filter((os) => h[os] && h[os] !== '-')
        .map((os) => {
          const osLabel = os === 'ubuntu' ? 'Ubuntu' : os === 'macos' ? 'macOS' : 'Windows';
          return '<tr><td><strong>' + osLabel + ':</strong></td><td>' + h[os] + '</td></tr>';
        })
        .join('\n');
      return label + '\n<table>\n' + osRows + '\n</table>';
    })
    .join('\n\n');
}

const jsonComment = '<!-- bench-history-json-start ' + JSON.stringify(history) + ' bench-history-json-end -->';
let body = '<!-- repomix-perf-benchmark -->\n' + jsonComment + '\n';
body += '## \u26a1 Performance Benchmark\n\n';
body +=
  '<table><tr><td><strong>Latest commit:</strong></td><td><code>' +
  shortSha +
  '</code> ' +
  esc(commitMsg) +
  '</td></tr>\n';
body += '<tr><td><strong>Status:</strong></td><td>\u2705 Benchmark complete!</td></tr>\n';
body += '<tr><td><strong>Ubuntu:</strong></td><td>' + ubuntuStr + '</td></tr>\n';
body += '<tr><td><strong>macOS:</strong></td><td>' + macosStr + '</td></tr>\n';
body += '<tr><td><strong>Windows:</strong></td><td>' + windowsStr + '</td></tr>\n';
body += '</table>\n\n';
body += '<details>\n<summary>Details</summary>\n\n';
body += '- Packing the repomix repository with `node bin/repomix.cjs`\n';
body += '- Warmup: 2 runs (discarded), interleaved execution\n';
body += '- Measurement: 20 runs / 30 on macOS (median \u00b1 IQR)\n';
body += '- [Workflow run](' + runUrl + ')\n\n';
body += '</details>';

const historyHtml = renderHistory(history);
if (historyHtml) {
  body += '\n\n<details>\n<summary>History</summary>\n\n' + historyHtml + '\n\n</details>';
}

// Write to step summary (without HTML comments)
const summaryFile = process.env.GITHUB_STEP_SUMMARY;
if (summaryFile) {
  const summaryBody = body
    .split('\n')
    .filter((l) => !l.startsWith('<!-- '))
    .join('\n');
  appendFileSync(summaryFile, summaryBody + '\n');
}

writeFileSync(process.env.RUNNER_TEMP + '/new-comment.md', body);
