let nodeCryptoPromise = null;

async function nodeCrypto() {
  if (!nodeCryptoPromise) {
    nodeCryptoPromise = import('node:crypto').catch(() => null);
  }
  return nodeCryptoPromise;
}

function browserCrypto() {
  return globalThis.crypto || null;
}

function requireText(input, label) {
  const text = String(input ?? '');
  if (text.length === 0) throw new Error(`${label} input is empty`);
  return text;
}

export function formatJson(input) {
  try {
    return JSON.stringify(JSON.parse(requireText(input, 'JSON')), null, 2);
  } catch (err) {
    throw new Error(`JSON parse failed: ${err.message}`);
  }
}

export function minifyJson(input) {
  try {
    return JSON.stringify(JSON.parse(requireText(input, 'JSON')));
  } catch (err) {
    throw new Error(`JSON parse failed: ${err.message}`);
  }
}

export function base64Encode(input) {
  return Buffer.from(String(input ?? ''), 'utf8').toString('base64');
}

export function base64Decode(input) {
  const text = requireText(input, 'Base64').trim();
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(text) || text.length % 4 === 1) {
    throw new Error('Base64 decode failed: invalid characters or padding');
  }
  return Buffer.from(text, 'base64').toString('utf8');
}

export function urlEncode(input) {
  return encodeURIComponent(String(input ?? ''));
}

export function urlDecode(input) {
  try {
    return decodeURIComponent(String(input ?? ''));
  } catch (err) {
    throw new Error(`URL decode failed: ${err.message}`);
  }
}

export async function generateUuid() {
  if (browserCrypto()?.randomUUID) return browserCrypto().randomUUID();
  const crypto = await nodeCrypto();
  if (crypto?.randomUUID) return crypto.randomUUID();
  throw new Error('UUID generation failed: crypto API unavailable');
}

export function parseTimestamp(input) {
  const raw = requireText(input, 'Timestamp').trim();
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) throw new Error('Timestamp parse failed: expected a number');
  const ms = Math.abs(numeric) < 10_000_000_000 ? numeric * 1000 : numeric;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) throw new Error('Timestamp parse failed: invalid date');
  return {
    iso: date.toISOString(),
    local: date.toLocaleString(),
    unixSeconds: Math.floor(ms / 1000),
    unixMilliseconds: Math.floor(ms),
  };
}

export async function generateHash(input, algorithm = 'SHA-256') {
  const text = String(input ?? '');
  const normalized = algorithm.toUpperCase();
  const subtle = browserCrypto()?.subtle || (await nodeCrypto())?.webcrypto?.subtle;
  if (!subtle) throw new Error('Hash generation failed: crypto API unavailable');
  const digest = await subtle.digest(normalized, new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function decodeBase64Url(part, label) {
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch (err) {
    throw new Error(`JWT decode failed in ${label}: ${err.message}`);
  }
}

export function decodeJwt(input) {
  const parts = requireText(input, 'JWT').split('.');
  if (parts.length < 2) throw new Error('JWT decode failed: expected header.payload.signature');
  return {
    header: decodeBase64Url(parts[0], 'header'),
    payload: decodeBase64Url(parts[1], 'payload'),
  };
}

function words(input) {
  return String(input ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());
}

function title(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function convertCase(input, mode) {
  const parts = words(input);
  switch (mode) {
    case 'camel':
      return parts.map((word, index) => (index === 0 ? word : title(word))).join('');
    case 'pascal':
      return parts.map(title).join('');
    case 'snake':
      return parts.join('_');
    case 'kebab':
      return parts.join('-');
    case 'upper':
      return parts.join('_').toUpperCase();
    case 'lower':
      return parts.join(' ');
    default:
      throw new Error(`Unsupported case mode: ${mode}`);
  }
}

export async function generateRandomString({ length = 32, alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' } = {}) {
  const size = Math.max(1, Math.min(4096, Number(length) || 32));
  const chars = String(alphabet || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  const bytes = new Uint8Array(size);
  const crypto = browserCrypto();
  if (crypto?.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    const node = await nodeCrypto();
    if (!node?.randomBytes) throw new Error('Random string generation failed: crypto API unavailable');
    bytes.set(node.randomBytes(size));
  }
  let output = '';
  for (let i = 0; i < size; i += 1) {
    output += chars[bytes[i] % chars.length];
  }
  return output;
}
