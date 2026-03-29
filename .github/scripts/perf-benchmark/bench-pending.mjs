import { readFileSync, writeFileSync } from 'node:fs';
import { esc, extractHistory, renderHistory } from './bench-utils.mjs';

const shortSha = process.env.COMMIT_SHA.slice(0, 7);
const commitMsg = process.env.COMMIT_MSG;
const runUrl = process.env.WORKFLOW_RUN_URL;
const oldBody = readFileSync(`${process.env.RUNNER_TEMP}/old-comment.txt`, 'utf8');

let history = extractHistory(oldBody);

// If previous comment had completed results, archive them into history
if (oldBody.includes('\u2705 Benchmark complete!')) {
  // Extract only the main result table (before any <details> block)
  const mainSection = oldBody.split('<details>')[0] || '';
  const commitMatch = mainSection.match(/Latest commit:<\/strong><\/td><td>(?:<code>)?([a-f0-9]+)(?:<\/code>)?\s*(.*?)<\/td>/);
  const prevSha = commitMatch ? commitMatch[1] : '';
  const prevMsg = commitMatch ? commitMatch[2] : '';
  if (prevSha) {
    const rowRe = /<tr><td><strong>(Ubuntu|macOS|Windows):<\/strong><\/td><td>(.*?)<\/td><\/tr>/g;
    const entry = { sha: prevSha, msg: prevMsg };
    for (let m = rowRe.exec(mainSection); m !== null; m = rowRe.exec(mainSection)) {
      entry[m[1].toLowerCase()] = m[2];
    }
    if (prevSha !== shortSha && !history.some((h) => h.sha === prevSha)) {
      history.unshift(entry);
    }
  }
}

// Keep max 50 entries
history = history.slice(0, 50);

const jsonComment = `<!-- bench-history-json-start ${JSON.stringify(history)} bench-history-json-end -->`;
let body = `<!-- repomix-perf-benchmark -->\n${jsonComment}\n`;
body += '## \u26a1 Performance Benchmark\n\n';
body += `<table><tr><td><strong>Latest commit:</strong></td><td>${shortSha} ${esc(commitMsg)}</td></tr>\n`;
body += '<tr><td><strong>Status:</strong></td><td>\u26a1 Benchmark in progress...</td></tr></table>\n\n';
body += `[Workflow run](${runUrl})`;

const historyHtml = renderHistory(history);
if (historyHtml) {
  body += `\n\n<details>\n<summary>History</summary>\n\n${historyHtml}\n\n</details>`;
}

writeFileSync(`${process.env.RUNNER_TEMP}/new-comment.md`, body);
