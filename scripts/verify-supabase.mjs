/**
 * Verify Supabase connection. Run after setting .env.local:
 *   node scripts/verify-supabase.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('Missing .env.local — copy .env.example and fill in Supabase credentials.');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    env[key] = rest.join('=').trim();
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key || url.includes('your-project')) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

console.log('Testing Supabase at', url);

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
};

// Test REST connectivity
const restRes = await fetch(`${url}/rest/v1/`, { headers });
console.log('REST API:', restRes.status, restRes.statusText);

// Test keepalive table (after migration)
const keepaliveRes = await fetch(`${url}/rest/v1/keepalive?select=last_ping`, { headers });
if (keepaliveRes.ok) {
  const data = await keepaliveRes.json();
  console.log('keepalive table:', data);
} else {
  console.warn('keepalive table not found — run supabase/migrations/001_initial_schema.sql');
}

// Test RPC
const rpcRes = await fetch(`${url}/rest/v1/rpc/ping_keepalive`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: '{}',
});
if (rpcRes.ok) {
  const ping = await rpcRes.json();
  console.log('ping_keepalive RPC:', ping);
} else {
  console.warn('ping_keepalive RPC not available — apply migration first');
}

console.log('\nVerification complete.');
