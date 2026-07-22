// Supabase Edge Function: send-push-notification
// Called by admin panel when broadcasting a notification.
// Uses Web Push (VAPID) to deliver to all subscribed devices.

import { createClient } from 'jsr:@supabase/supabase-js@2';

// Minimal VAPID signing for Web Push using Web Crypto API (no npm deps)
async function signVapid(audience, subject, privateKeyB64u, publicKeyB64u) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const b64u = (obj) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const sigInput = `${b64u(header)}.${b64u(payload)}`;

  // Import private key
  const pkBytes = Uint8Array.from(
    atob(privateKeyB64u.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0)
  );
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pkBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(sigInput)
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return {
    token: `${sigInput}.${sig}`,
    publicKey: publicKeyB64u,
  };
}

async function sendWebPush(subscription, payload, vapidPublic, vapidPrivate, vapidSubject) {
  const { endpoint, p256dh, auth } = subscription;
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const { token, publicKey } = await signVapid(audience, vapidSubject, vapidPrivate, vapidPublic);

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      Authorization: `vapid t=${token},k=${publicKey}`,
      TTL: '86400',
    },
    body: await encryptPayload(payload, p256dh, auth),
  });

  return resp.status;
}

// Web Push payload encryption (RFC 8291 / aes128gcm)
async function encryptPayload(plaintext, p256dhB64u, authB64u) {
  const decoder = new TextDecoder();

  const fromB64u = (s) =>
    Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

  const authSecret = fromB64u(authB64u);
  const clientPublicKey = fromB64u(p256dhB64u);

  // Generate server key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // ECDH shared secret
  const sharedBits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, serverKeyPair.privateKey, 256)
  );

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF
  const hkdf = async (ikm, salt, info, len) => {
    const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(
      await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8)
    );
  };

  const prk = await hkdf(sharedBits, authSecret, concatBytes(
    new TextEncoder().encode('WebPush: info\x00'),
    clientPublicKey,
    serverPublicKeyRaw
  ), 32);

  const cek = await hkdf(prk, salt, concatBytes(
    new TextEncoder().encode('Content-Encoding: aes128gcm\x00'),
    new Uint8Array([1])
  ), 16);

  const nonce = await hkdf(prk, salt, concatBytes(
    new TextEncoder().encode('Content-Encoding: nonce\x00'),
    new Uint8Array([1])
  ), 12);

  // Encrypt
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const data = new TextEncoder().encode(plaintext);
  // Pad: append \x02 delimiter
  const padded = concatBytes(data, new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
  );

  // Build aes128gcm content-encoding header (RFC 8188)
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096, false);
  const header = concatBytes(salt, recordSize, new Uint8Array([serverPublicKeyRaw.length]), serverPublicKeyRaw);
  return concatBytes(header, ciphertext);
}

function concatBytes(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { title, body, url } = await req.json();

    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'title and body are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Use service role key to bypass RLS and read all subscriptions
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // Verify caller is authenticated admin
    const authHeader = req.headers.get('Authorization');
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY')
    );
    const { data: { user } } = await anonClient.auth.getUser(authHeader?.replace('Bearer ', '') ?? '');
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: admins only' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Fetch all subscriptions
    const { data: subs, error: subError } = await supabase.from('push_subscriptions').select('*');
    if (subError) throw subError;
    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscribers' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@8pxstudio.com';
    const payload = JSON.stringify({ title, body, url: url ?? '/' });

    let sent = 0;
    let failed = 0;
    const expiredIds = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          const status = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
            vapidPublic,
            vapidPrivate,
            vapidSubject
          );
          if (status === 201 || status === 200) {
            sent++;
          } else if (status === 410 || status === 404) {
            // Subscription expired — clean up
            expiredIds.push(sub.id);
            failed++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      })
    );

    // Remove expired subscriptions
    if (expiredIds.length) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds);
    }

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
