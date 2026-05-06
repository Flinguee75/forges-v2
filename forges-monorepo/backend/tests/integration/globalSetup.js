const { execFileSync } = require('child_process');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..', '..');

module.exports = async function globalSetup() {
  // Seed once in an isolated process before any test suite runs.
  // seed.e2e.ts starts with cleanupScenarioData() so it is idempotent.
  execFileSync(
    process.execPath,
    ['-r', 'ts-node/register/transpile-only', path.join(backendRoot, 'prisma', 'seed.e2e.ts')],
    {
      cwd: backendRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
      stdio: 'inherit',
    }
  );
};
