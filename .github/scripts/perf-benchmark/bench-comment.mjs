import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { esc, extractHistory, renderHistory } from './bench-utils.mjs';

const shortSha = process.env.COMMIT_SHA.slice(0, 7);
const commitMsg = process.env.COMMIT_MSG;
const runUrl = process.env.WORKFLOW_RUN_URL;
const oldBody = readFileSync(`${process.env.RUNNER_TEMP}/old-comment.txt`, 'utf8');

const history = extractHistory(oldBody);

// Read benchmark results from artifacts
function readResult(os) {
  const file = join('results', `bench-result-${os}`, 'bench-result.json');
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
  const diffSec = `${diff >= 0 ? '+' : ''}${(diff / 1000).toFixed(2)}`;
  const diffPct = data.main > 0 ? `${diff >= 0 ? '+' : ''}${((diff / data.main) * 100).toFixed(1)}` : 'N/A';
  return `${mainSec}s (\u00b1${mainIqr}s) \u2192 ${prSec}s (\u00b1${prIqr}s) \u00b7 ${diffSec}s (${diffPct}%)`;
}

const ubuntuStr = formatResult(readResult('ubuntu-latest'));
const macosStr = formatResult(readResult('macos-latest'));
const windowsStr = formatResult(readResult('windows-latest'));

const jsonComment = `<!-- bench-history-json-start ${JSON.stringify(history)} bench-history-json-end -->`;
let body = `<!-- repomix-perf-benchmark -->\n${jsonComment}\n`;
body += '## \u26a1 Performance Benchmark\n\n';
body += `<table><tr><td><strong>Latest commit:</strong></td><td>${shortSha} ${esc(commitMsg)}</td></tr>\n`;
body += `<tr><td><strong>Status:</strong></td><td>\u2705 Benchmark complete!</td></tr>\n`;
body += `<tr><td><strong>Ubuntu:</strong></td><td>${ubuntuStr}</td></tr>\n`;
body += `<tr><td><strong>macOS:</strong></td><td>${macosStr}</td></tr>\n`;
body += `<tr><td><strong>Windows:</strong></td><td>${windowsStr}</td></tr>\n`;
body += '</table>\n\n';
body += '<details>\n<summary>Details</summary>\n\n';
body += '- Packing the repomix repository with `node bin/repomix.cjs`\n';
body += '- Warmup: 2 runs (discarded), interleaved execution\n';
body += '- Measurement: 20 runs / 30 on macOS (median \u00b1 IQR)\n';
body += `- [Workflow run](${runUrl})\n\n`;
body += '</details>';

const historyHtml = renderHistory(history);
if (historyHtml) {
  body += `\n\n<details>\n<summary>History</summary>\n\n${historyHtml}\n\n</details>`;
}

// Write to step summary (without HTML comments)
const summaryFile = process.env.GITHUB_STEP_SUMMARY;
if (summaryFile) {
  const summaryBody = body
    .split('\n')
    .filter((l) => !l.startsWith('<!-- '))
    .join('\n');
  appendFileSync(summaryFile, `${summaryBody}\n`);
}

writeFileSync(`${process.env.RUNNER_TEMP}/new-comment.md`, body);
