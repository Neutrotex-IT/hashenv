#!/usr/bin/env node
/**
 * HashEnv CLI — pull env files and run commands with injected secrets.
 *
 * Environment variables:
 *   HASHENV_API_URL   Base URL (default: http://localhost:3001/api/v1)
 *   HASHENV_TOKEN     API token (henv_...)
 *   HASHENV_PROJECT   Project ID
 */

const { parseArgs } = require('node:util');

function getConfig() {
  const apiUrl = (process.env.HASHENV_API_URL || 'http://localhost:3001/api/v1').replace(/\/$/, '');
  const token = process.env.HASHENV_TOKEN;
  const projectId = process.env.HASHENV_PROJECT;
  return { apiUrl, token, projectId };
}

function requireConfig(config) {
  if (!config.token) {
    console.error('Error: HASHENV_TOKEN is required');
    process.exit(1);
  }
  if (!config.projectId) {
    console.error('Error: HASHENV_PROJECT is required');
    process.exit(1);
  }
}

async function apiRequest(config, method, path, body) {
  const url = `${config.apiUrl}${path}`;
  const headers = {
    Authorization: `Bearer ${config.token}`,
  };

  const options = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  if (!response.ok) {
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.error || text;
    } catch {
      // use raw text
    }
    throw new Error(`API ${response.status}: ${message}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json') && text) {
    return JSON.parse(text);
  }
  return text;
}

function printHelp() {
  console.log(`HashEnv CLI

Usage:
  hashenv pull [--env <slug>] [--output <file>]
  hashenv run [--env <slug>] -- <command> [args...]
  hashenv secret get <name>
  hashenv secret set <name> [--value <text> | --stdin]
  hashenv env put [--env <slug>] [--file <path> | --stdin]

Environment:
  HASHENV_API_URL    API base URL (default: http://localhost:3001/api/v1)
  HASHENV_TOKEN      Project API token
  HASHENV_PROJECT    Project ID

Examples:
  HASHENV_TOKEN=henv_xxx HASHENV_PROJECT=abc123 hashenv pull --env dev -o .env
  HASHENV_TOKEN=henv_xxx HASHENV_PROJECT=abc123 hashenv run --env dev -- npm start
`);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function cmdPull(config, args) {
  const { values } = parseArgs({
    args,
    options: {
      env: { type: 'string', default: 'dev' },
      output: { type: 'string', short: 'o' },
    },
    allowPositionals: false,
  });

  const content = await apiRequest(
    config,
    'GET',
    `/projects/${config.projectId}/env?environment=${encodeURIComponent(values.env)}`
  );

  if (values.output) {
    const fs = require('node:fs');
    fs.writeFileSync(values.output, content, 'utf8');
    console.error(`Wrote ${values.output}`);
  } else {
    process.stdout.write(content);
  }
}

async function cmdRun(config, args) {
  const sep = args.indexOf('--');
  const runArgs = sep >= 0 ? args.slice(sep + 1) : [];
  const flagArgs = sep >= 0 ? args.slice(0, sep) : args;

  if (runArgs.length === 0) {
    console.error('Error: command required after --');
    process.exit(1);
  }

  const { values } = parseArgs({
    args: flagArgs,
    options: {
      env: { type: 'string', default: 'dev' },
    },
    allowPositionals: false,
  });

  const content = await apiRequest(
    config,
    'GET',
    `/projects/${config.projectId}/env?environment=${encodeURIComponent(values.env)}`
  );

  const env = { ...process.env };
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) env[key] = value;
  }

  const { spawn } = require('node:child_process');
  const [cmd, ...cmdArgs] = runArgs;
  const child = spawn(cmd, cmdArgs, { stdio: 'inherit', env, shell: process.platform === 'win32' });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });
}

async function cmdSecretGet(config, name) {
  const data = await apiRequest(
    config,
    'GET',
    `/projects/${config.projectId}/secrets/${encodeURIComponent(name)}`
  );
  process.stdout.write(data.content);
}

async function cmdSecretSet(config, name, args) {
  const { values } = parseArgs({
    args,
    options: {
      value: { type: 'string' },
      stdin: { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  let content = values.value;
  if (values.stdin || content === undefined) {
    content = await readStdin();
  }

  try {
    await apiRequest(
      config,
      'PUT',
      `/projects/${config.projectId}/secrets/${encodeURIComponent(name)}`,
      { content }
    );
    console.error(`Updated secret: ${name}`);
  } catch (err) {
    if (err.message.includes('404')) {
      await apiRequest(
        config,
        'POST',
        `/projects/${config.projectId}/secrets`,
        { name, content }
      );
      console.error(`Created secret: ${name}`);
    } else {
      throw err;
    }
  }
}

async function cmdEnvPut(config, args) {
  const { values } = parseArgs({
    args,
    options: {
      env: { type: 'string', default: 'dev' },
      file: { type: 'string', short: 'f' },
      stdin: { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  let content;
  if (values.file) {
    const fs = require('node:fs');
    content = fs.readFileSync(values.file, 'utf8');
  } else {
    content = await readStdin();
  }

  const result = await apiRequest(
    config,
    'PUT',
    `/projects/${config.projectId}/env`,
    { environment: values.env, content }
  );
  console.error(`Uploaded ${values.env} v${result.version}`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const config = getConfig();
  requireConfig(config);

  switch (command) {
    case 'pull':
      await cmdPull(config, rest);
      break;
    case 'run':
      await cmdRun(config, rest);
      break;
    case 'secret': {
      const [sub, name, ...subArgs] = rest;
      if (sub === 'get' && name) {
        await cmdSecretGet(config, name);
      } else if (sub === 'set' && name) {
        await cmdSecretSet(config, name, subArgs);
      } else {
        console.error('Usage: hashenv secret get <name> | hashenv secret set <name> [--value <text>]');
        process.exit(1);
      }
      break;
    }
    case 'env': {
      const [sub, ...subArgs] = rest;
      if (sub === 'put') {
        await cmdEnvPut(config, subArgs);
      } else {
        console.error('Usage: hashenv env put [--env <slug>] [--file <path>]');
        process.exit(1);
      }
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
