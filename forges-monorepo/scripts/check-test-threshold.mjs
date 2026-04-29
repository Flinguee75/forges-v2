#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    report: null,
    min: 0.95,
    label: 'tests',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === '--report') {
      args.report = argv[i + 1];
      i += 1;
    } else if (current === '--min') {
      args.min = Number(argv[i + 1]);
      i += 1;
    } else if (current === '--label') {
      args.label = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

const { report, min, label } = parseArgs(process.argv.slice(2));

if (!report) {
  console.error('[threshold] missing --report <file>');
  process.exit(1);
}

const reportPath = path.resolve(process.cwd(), report);
if (!fs.existsSync(reportPath)) {
  console.error(`[threshold] report not found: ${reportPath}`);
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
} catch (error) {
  console.error(`[threshold] invalid JSON report: ${reportPath}`);
  console.error(error?.message || error);
  process.exit(1);
}

const passed = Number(payload?.numPassedTests ?? 0);
const failed = Number(payload?.numFailedTests ?? 0);
const executed = passed + failed;

if (executed === 0) {
  console.error(`[threshold] no executed tests found in ${reportPath}`);
  process.exit(1);
}

const ratio = passed / executed;
const ratioPct = (ratio * 100).toFixed(2);
const minPct = (min * 100).toFixed(2);

console.log(`[threshold] ${label}: ${passed}/${executed} passed (${ratioPct}%)`);

if (ratio < min) {
  console.error(`[threshold] below minimum threshold ${minPct}%`);
  process.exit(1);
}

if (failed > 0) {
  console.warn(`[threshold] ${failed} failing tests tolerated under ${minPct}% gate`);
}
