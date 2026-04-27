import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendDir = resolve(__dirname, '..');
const repoDir = resolve(backendDir, '..');
const composeFile = resolve(repoDir, 'infra/docker-compose.yml');

const childProcesses = [];

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
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function startProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: options.stdio || 'inherit',
    shell: false,
  });
  childProcesses.push(child);
  return child;
}

function waitForPort(port, host, timeoutMs) {
  const startedAt = Date.now();
  return new Promise((resolvePromise, rejectPromise) => {
    const attempt = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
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
        rejectPromise(new Error(`${host}:${port} did not become reachable`));
        return;
      }
      setTimeout(attempt, 1000);
    };
    attempt();
  });
}

async function waitForHttp(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not ready yet.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1000));
  }
  throw new Error(`${url} did not become healthy`);
}

async function ensurePortAvailable(port) {
  let output = '';
  try {
    output = execFileSync('lsof', ['-ti', `tcp:${port}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return;
  }

  for (const pid of output.split('\n').map((value) => Number(value.trim())).filter(Boolean)) {
    if (pid !== process.pid) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch {
        // Ignore already stopped processes.
      }
    }
  }
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 1500));
}

async function cleanup() {
  for (const child of childProcesses.reverse()) {
    if (!child.killed) child.kill('SIGTERM');
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await cleanup();
    process.exit(1);
  });
}

try {
  console.log('[rm] Starting postgres and redis');
  try {
    await runCommand('docker', ['compose', '-f', composeFile, 'up', '-d', 'postgres', 'redis'], { cwd: repoDir });
  } catch (error) {
    console.warn(`[rm] docker compose startup failed: ${error.message}`);
    console.warn('[rm] Continuing with services already bound on 127.0.0.1 if reachable.');
  }

  await waitForPort(5432, '127.0.0.1', 30000);
  await waitForPort(6379, '127.0.0.1', 30000);

  console.log('[rm] Pushing prisma schema');
  await runCommand('npx', ['prisma', 'db', 'push', '--skip-generate'], { cwd: backendDir });

  console.log('[rm] Seeding deterministic RM fixtures');
  await runCommand('npm', ['run', 'prisma:seed:e2e'], {
    cwd: backendDir,
    env: { E2E_SEED_MODE: 'e2e' },
  });

  await ensurePortAvailable(3000);

  console.log('[rm] Starting backend');
  startProcess('npm', ['run', 'start:e2e'], {
    cwd: backendDir,
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://forges:forges123@localhost:5432/forges',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      JWT_SECRET: process.env.JWT_SECRET || 'supersecret_jwt_change_me',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'supersecret_refresh_change_me',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '32_bytes_base64_key',
      WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'dev-secret',
    },
  });
  await waitForHttp('http://127.0.0.1:3000/health', 30000);

  console.log('[rm] Running Vague 1 RM API tests');
  await runCommand('npx', ['jest', '--config', 'jest.rm.config.js', '--runInBand'], {
    cwd: backendDir,
    env: {
      API_URL: 'http://127.0.0.1:3000',
      WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'dev-secret',
    },
  });
} finally {
  await cleanup();
}
