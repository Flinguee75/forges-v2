import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import net from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDir = resolve(__dirname, '..');
const repoDir = resolve(frontendDir, '..');
const backendDir = resolve(repoDir, 'backend');
const composeFile = resolve(repoDir, 'infra/docker-compose.yml');

const E2E_BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const E2E_API_URL = process.env.E2E_API_URL || 'http://127.0.0.1:3000/api';
const API_ORIGIN = new URL(E2E_API_URL).origin;
const FRONTEND_ORIGIN = new URL(E2E_BASE_URL).origin;

const childProcesses = [];

function logStep(message) {
  console.log(`\n[e2e] ${message}`);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: options.stdio || 'inherit',
      shell: false,
    });

    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function startProcess(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: options.stdio || 'inherit',
    shell: false,
  });

  childProcesses.push({ name, child });
  child.on('exit', (code, signal) => {
    if (!child.killed && code && code !== 0) {
      console.error(`[e2e] ${name} stopped unexpectedly (${signal || code})`);
    }
  });

  return child;
}

function waitForPort(port, host, timeoutMs, failureHint) {
  const startedAt = Date.now();

  return new Promise((resolvePromise, rejectPromise) => {
    const tryConnect = () => {
      const socket = new net.Socket();

      socket.setTimeout(1_000);
      socket.once('connect', () => {
        socket.destroy();
        resolvePromise();
      });
      socket.once('timeout', () => {
        socket.destroy();
        retry();
      });
      socket.once('error', () => {
        socket.destroy();
        retry();
      });
      socket.connect(port, host);
    };

    const retry = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        rejectPromise(new Error(failureHint));
        return;
      }

      setTimeout(tryConnect, 1_000);
    };

    tryConnect();
  });
}

async function waitForHttp(url, timeoutMs, failureHint) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Service not ready yet.
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
  }

  throw new Error(failureHint);
}

async function ensurePortAvailable(port, name) {
  let output = '';

  try {
    output = execFileSync('lsof', ['-ti', `tcp:${port}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return;
  }

  const pids = output
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value !== process.pid);

  if (pids.length === 0) {
    return;
  }

  console.warn(`[e2e] Stopping existing ${name} listener(s) on port ${port}: ${pids.join(', ')}`);

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Ignore already stopped processes.
    }
  }

  await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_500));
}

async function cleanup() {
  for (const { child } of childProcesses.reverse()) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await cleanup();
    process.exit(1);
  });
}

async function main() {
  logStep('Starting postgres and redis');
  try {
    await runCommand('docker', ['compose', '-f', composeFile, 'up', '-d', 'postgres', 'redis'], {
      cwd: repoDir,
    });
  } catch (error) {
    console.warn(`[e2e] docker compose startup failed: ${error.message}`);
    console.warn('[e2e] Continuing with services already bound on 127.0.0.1 if they are reachable.');
  }

  logStep('Waiting for postgres and redis');
  await waitForPort(5432, '127.0.0.1', 30_000, 'postgres did not become reachable on 127.0.0.1:5432');
  await waitForPort(6379, '127.0.0.1', 30_000, 'redis did not become reachable on 127.0.0.1:6379');

  logStep('Pushing prisma schema');
  await runCommand('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    cwd: backendDir,
  });

  logStep('Seeding dedicated e2e fixtures');
  await runCommand('npm', ['run', 'prisma:seed:e2e'], {
    cwd: backendDir,
    env: {
      E2E_SEED_MODE: process.env.E2E_SEED_MODE || 'e2e',
    },
  });

  const backendHealthUrl = `${API_ORIGIN}/health`;
  await ensurePortAvailable(3000, 'backend');
  logStep('Starting backend');
  startProcess('backend', 'npm', ['run', 'start:e2e'], {
    cwd: backendDir,
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      FRONTEND_URL: FRONTEND_ORIGIN,
      CORS_ORIGINS: FRONTEND_ORIGIN,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://forges:forges123@localhost:5432/forges',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      JWT_SECRET: process.env.JWT_SECRET || 'supersecret_jwt_change_me',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'supersecret_refresh_change_me',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '32_bytes_base64_key',
      WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'dev-secret',
      DEFAULT_COMMISSION_FORGES_PCT: process.env.DEFAULT_COMMISSION_FORGES_PCT || '20',
      DEFAULT_COMMISSION_APPORTEUR_PCT: process.env.DEFAULT_COMMISSION_APPORTEUR_PCT || '5',
      SEUIL_REVERSEMENT_PARTENAIRE_XOF: process.env.SEUIL_REVERSEMENT_PARTENAIRE_XOF || '50000',
      SEUIL_REVERSEMENT_APPORTEUR_XOF: process.env.SEUIL_REVERSEMENT_APPORTEUR_XOF || '5000',
      VALIDATION_PARTENAIRE_DELAI_JOURS: process.env.VALIDATION_PARTENAIRE_DELAI_JOURS || '5',
    },
  });
  await waitForHttp(backendHealthUrl, 30_000, `backend did not become healthy on ${backendHealthUrl}`);

  await ensurePortAvailable(4173, 'frontend');
  logStep('Starting frontend');
  startProcess('frontend', 'npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    cwd: frontendDir,
    env: {
      VITE_API_URL: E2E_API_URL,
    },
  });
  await waitForHttp(E2E_BASE_URL, 30_000, `frontend did not become reachable on ${E2E_BASE_URL}`);

  logStep('Running Playwright tests');
  const extraArgs = process.argv.slice(2);
  await runCommand('npx', ['playwright', 'test', ...extraArgs], {
    cwd: frontendDir,
    env: {
      E2E_BASE_URL,
      E2E_API_URL,
      E2E_HEADLESS: process.env.E2E_HEADLESS || 'true',
    },
  });
}

main()
  .catch(async (error) => {
    console.error(`\n[e2e] ${error.message}`);
    process.exitCode = 1;
    await cleanup();
  })
  .then(async () => {
    await cleanup();
  });
