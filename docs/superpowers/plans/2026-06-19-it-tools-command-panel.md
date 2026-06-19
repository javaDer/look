# it-tools Command Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Linux-first `/tools` command panel that exposes the full it-tools catalog, native high-frequency tools, and a built-in/self-hosted web fallback, while preserving a macOS-compatible catalog shape.

**Architecture:** The Linux command panel gains one new top-level command module, `tools`, with a shared catalog, focused native tool runners, and a web fallback panel. Native tool logic is pure JavaScript and tested with Node's built-in test runner; command-panel UI modules adapt that logic to the existing HTML/CSS command layout. The catalog is stored as data with execution metadata so macOS can later consume the same shape.

**Tech Stack:** Tauri 2, Rust config commands, plain ES modules, HTML fragments loaded by `html-loader.js`, CSS in `commands.css`, Node `node:test`, existing `cargo test`.

---

## File Structure

- Create `apps/linows/src/js/screens/commands/tools/catalog.js`: single catalog source for all current it-tools entries, categories, aliases, upstream routes, and execution kind.
- Create `apps/linows/src/js/screens/commands/tools/native/core.js`: pure native tool functions for JSON, Base64, URL, UUID, timestamp, hash, JWT, case conversion, and random string generation.
- Create `apps/linows/src/js/screens/commands/tools/native/core.test.mjs`: Node tests for native tool behavior.
- Create `apps/linows/src/js/screens/commands/tools/index.js`: `/tools` command UI controller.
- Create `apps/linows/src/js/screens/commands/tools/webview.js`: built-in/self-hosted web route resolution and inline fallback state.
- Create `apps/linows/src/html/screens/commands/tools.html`: HTML fragment for the tools panel.
- Modify `apps/linows/src/js/screens/commands/index.js`: register `/tools`, native aliases, command switching, and forwarded feedback.
- Modify `apps/linows/src/js/app.js`: load `tools.html`, expand command prefix map, update command hint handling, and pass config/copy hooks into tools.
- Modify `apps/linows/src/js/icons.js`: export the `toolbox` icon used by the tools command.
- Modify `apps/linows/src/css/components/commands.css`: add layout rules for catalog, native tool panels, result preview, and web fallback states.
- Modify `apps/linows/src/html/screens/settings.html`: add it-tools settings controls.
- Modify `apps/linows/src/js/screens/settings.js`: read/write `it_tools_web_source` and `it_tools_self_hosted_url`.
- Modify `apps/linows/src-tauri/src/default_config.txt`: add default it-tools config keys.
- Create `apps/linows/src/vendor/it-tools/README.md`: document vendored asset boundary, source, license, and update command.
- Create `apps/linows/src/vendor/it-tools/.gitkeep`: keep the asset directory present before real vendored assets are added.
- Create `docs/superpowers/plans/2026-06-19-it-tools-command-panel.md`: this plan.

## Task 1: Catalog Data

**Files:**
- Create: `apps/linows/src/js/screens/commands/tools/catalog.js`
- Test: `apps/linows/src/js/screens/commands/tools/catalog.test.mjs`

- [ ] **Step 1: Write the catalog tests**

Create `apps/linows/src/js/screens/commands/tools/catalog.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NATIVE_TOOL_IDS,
  findToolByAlias,
  searchTools,
  toolsByCategory,
  toolsCatalog,
} from './catalog.js';

test('catalog includes every current upstream it-tools category', () => {
  assert.deepEqual(
    toolsByCategory.map((category) => category.name),
    [
      'Crypto',
      'Converter',
      'Web',
      'Images and videos',
      'Development',
      'Network',
      'Math',
      'Measurement',
      'Text',
      'Data',
    ],
  );
});

test('catalog has no duplicate ids or aliases', () => {
  const ids = new Set();
  const aliases = new Set();

  for (const tool of toolsCatalog) {
    assert.ok(tool.id, 'tool id is required');
    assert.equal(ids.has(tool.id), false, `duplicate id: ${tool.id}`);
    ids.add(tool.id);

    for (const alias of tool.aliases) {
      assert.equal(aliases.has(alias), false, `duplicate alias: ${alias}`);
      aliases.add(alias);
    }
  }
});

test('native aliases resolve to the expected first-version tools', () => {
  assert.equal(findToolByAlias('json').id, 'json-format');
  assert.equal(findToolByAlias('base64').id, 'base64-string-converter');
  assert.equal(findToolByAlias('url').id, 'url-encoder');
  assert.equal(findToolByAlias('uuid').id, 'uuid-generator');
  assert.equal(findToolByAlias('timestamp').id, 'date-time-converter');
  assert.equal(findToolByAlias('hash').id, 'hash-text');
  assert.equal(findToolByAlias('jwt').id, 'jwt-parser');
  assert.equal(findToolByAlias('case').id, 'case-converter');
  assert.equal(findToolByAlias('random').id, 'token-generator');
});

test('native tool id set matches the design native scope', () => {
  assert.deepEqual([...NATIVE_TOOL_IDS].sort(), [
    'base64-string-converter',
    'case-converter',
    'date-time-converter',
    'hash-text',
    'json-format',
    'jwt-parser',
    'token-generator',
    'url-encoder',
    'uuid-generator',
  ]);
});

test('search matches names, aliases, keywords, and categories', () => {
  assert.equal(searchTools('json format')[0].id, 'json-format');
  assert.equal(searchTools('random string')[0].id, 'token-generator');
  assert.ok(searchTools('network').some((tool) => tool.id === 'ipv4-subnet-calculator'));
  assert.ok(searchTools('base64').some((tool) => tool.id === 'base64-string-converter'));
});
```

- [ ] **Step 2: Run the catalog tests to verify they fail**

Run:

```bash
node --test apps/linows/src/js/screens/commands/tools/catalog.test.mjs
```

Expected: FAIL with `Cannot find module` for `catalog.js`.

- [ ] **Step 3: Implement the catalog module**

Create `apps/linows/src/js/screens/commands/tools/catalog.js`:

```js
export const EXECUTION_NATIVE = 'native';
export const EXECUTION_WEB = 'web';

export const NATIVE_TOOL_IDS = new Set([
  'json-format',
  'base64-string-converter',
  'url-encoder',
  'uuid-generator',
  'date-time-converter',
  'hash-text',
  'jwt-parser',
  'case-converter',
  'token-generator',
]);

function tool(id, name, route, keywords = [], aliases = []) {
  return {
    id,
    name,
    route: `/${route}`,
    keywords,
    aliases,
    execution: NATIVE_TOOL_IDS.has(id) ? EXECUTION_NATIVE : EXECUTION_WEB,
  };
}

export const toolsByCategory = [
  {
    name: 'Crypto',
    components: [
      tool('token-generator', 'Token generator', 'token-generator', ['random', 'string', 'password'], ['random']),
      tool('hash-text', 'Hash text', 'hash-text', ['sha', 'md5', 'digest'], ['hash']),
      tool('bcrypt', 'Bcrypt', 'bcrypt', ['password']),
      tool('uuid-generator', 'UUID generator', 'uuid-generator', ['guid'], ['uuid']),
      tool('ulid-generator', 'ULID generator', 'ulid-generator', ['identifier']),
      tool('encryption', 'Encrypt / decrypt text', 'encryption', ['cipher', 'aes']),
      tool('bip39-generator', 'BIP39 passphrase generator', 'bip39-generator', ['mnemonic']),
      tool('hmac-generator', 'HMAC generator', 'hmac-generator', ['hash']),
      tool('rsa-key-pair-generator', 'RSA key pair generator', 'rsa-key-pair-generator', ['key']),
      tool('password-strength-analyser', 'Password strength analyser', 'password-strength-analyser', ['security']),
      tool('pdf-signature-checker', 'PDF signature checker', 'pdf-signature-checker', ['signature']),
    ],
  },
  {
    name: 'Converter',
    components: [
      tool('date-time-converter', 'Date-time converter', 'date-time-converter', ['timestamp', 'epoch'], ['timestamp']),
      tool('integer-base-converter', 'Integer base converter', 'integer-base-converter', ['binary', 'hex']),
      tool('roman-numeral-converter', 'Roman numeral converter', 'roman-numeral-converter', ['number']),
      tool('base64-string-converter', 'Base64 string converter', 'base64-string-converter', ['encode', 'decode'], ['base64']),
      tool('base64-file-converter', 'Base64 file converter', 'base64-file-converter', ['file']),
      tool('color-converter', 'Color converter', 'color-converter', ['rgb', 'hex']),
      tool('case-converter', 'Case converter', 'case-converter', ['camel', 'snake', 'kebab'], ['case']),
      tool('text-to-nato-alphabet', 'Text to NATO alphabet', 'text-to-nato-alphabet', ['phonetic']),
      tool('text-to-binary', 'Text to binary', 'text-to-binary', ['binary']),
      tool('text-to-unicode', 'Text to Unicode', 'text-to-unicode', ['unicode']),
      tool('yaml-to-json-converter', 'YAML to JSON', 'yaml-to-json-converter', ['yaml', 'json']),
      tool('yaml-to-toml', 'YAML to TOML', 'yaml-to-toml', ['yaml', 'toml']),
      tool('json-to-yaml-converter', 'JSON to YAML', 'json-to-yaml-converter', ['json', 'yaml']),
      tool('json-to-toml', 'JSON to TOML', 'json-to-toml', ['json', 'toml']),
      tool('list-converter', 'List converter', 'list-converter', ['array', 'csv']),
      tool('toml-to-json', 'TOML to JSON', 'toml-to-json', ['toml', 'json']),
      tool('toml-to-yaml', 'TOML to YAML', 'toml-to-yaml', ['toml', 'yaml']),
      tool('xml-to-json', 'XML to JSON', 'xml-to-json', ['xml', 'json']),
      tool('json-to-xml', 'JSON to XML', 'json-to-xml', ['json', 'xml']),
      tool('markdown-to-html', 'Markdown to HTML', 'markdown-to-html', ['markdown']),
    ],
  },
  {
    name: 'Web',
    components: [
      tool('url-encoder', 'URL encoder / decoder', 'url-encoder', ['percent', 'uri'], ['url']),
      tool('html-entities', 'HTML entities', 'html-entities', ['escape']),
      tool('url-parser', 'URL parser', 'url-parser', ['uri']),
      tool('device-information', 'Device information', 'device-information', ['browser']),
      tool('basic-auth-generator', 'Basic auth generator', 'basic-auth-generator', ['authorization']),
      tool('meta-tag-generator', 'Meta tag generator', 'meta-tag-generator', ['seo']),
      tool('otp-code-generator-and-validator', 'OTP code generator and validator', 'otp-code-generator-and-validator', ['totp']),
      tool('mime-types', 'MIME types', 'mime-types', ['content-type']),
      tool('jwt-parser', 'JWT parser', 'jwt-parser', ['token'], ['jwt']),
      tool('keycode-info', 'Keycode info', 'keycode-info', ['keyboard']),
      tool('slugify-string', 'Slugify string', 'slugify-string', ['slug']),
      tool('html-wysiwyg-editor', 'HTML WYSIWYG editor', 'html-wysiwyg-editor', ['editor']),
      tool('user-agent-parser', 'User-agent parser', 'user-agent-parser', ['browser']),
      tool('http-status-codes', 'HTTP status codes', 'http-status-codes', ['status']),
      tool('json-diff', 'JSON diff', 'json-diff', ['compare']),
      tool('safelink-decoder', 'Safelink decoder', 'safelink-decoder', ['url']),
    ],
  },
  {
    name: 'Images and videos',
    components: [
      tool('qr-code-generator', 'QR code generator', 'qr-code-generator', ['qr']),
      tool('wifi-qr-code-generator', 'WiFi QR code generator', 'wifi-qr-code-generator', ['wifi']),
      tool('svg-placeholder-generator', 'SVG placeholder generator', 'svg-placeholder-generator', ['image']),
      tool('camera-recorder', 'Camera recorder', 'camera-recorder', ['video']),
    ],
  },
  {
    name: 'Development',
    components: [
      tool('git-memo', 'Git memo', 'git-memo', ['git']),
      tool('random-port-generator', 'Random port generator', 'random-port-generator', ['port']),
      tool('crontab-generator', 'Crontab generator', 'crontab-generator', ['cron']),
      tool('json-viewer', 'JSON viewer', 'json-viewer', ['format', 'prettify'], ['json']),
      tool('json-minify', 'JSON minify', 'json-minify', ['json']),
      tool('json-to-csv', 'JSON to CSV', 'json-to-csv', ['csv']),
      tool('sql-prettify', 'SQL prettify', 'sql-prettify', ['sql']),
      tool('chmod-calculator', 'chmod calculator', 'chmod-calculator', ['permissions']),
      tool('docker-run-to-docker-compose-converter', 'Docker run to Docker compose', 'docker-run-to-docker-compose-converter', ['docker']),
      tool('xml-formatter', 'XML formatter', 'xml-formatter', ['xml']),
      tool('yaml-viewer', 'YAML viewer', 'yaml-viewer', ['yaml']),
      tool('email-normalizer', 'Email normalizer', 'email-normalizer', ['email']),
      tool('regex-tester', 'Regex tester', 'regex-tester', ['regexp']),
      tool('regex-memo', 'Regex memo', 'regex-memo', ['regexp']),
    ],
  },
  {
    name: 'Network',
    components: [
      tool('ipv4-subnet-calculator', 'IPv4 subnet calculator', 'ipv4-subnet-calculator', ['cidr']),
      tool('ipv4-address-converter', 'IPv4 address converter', 'ipv4-address-converter', ['ip']),
      tool('ipv4-range-expander', 'IPv4 range expander', 'ipv4-range-expander', ['ip']),
      tool('mac-address-lookup', 'MAC address lookup', 'mac-address-lookup', ['vendor']),
      tool('mac-address-generator', 'MAC address generator', 'mac-address-generator', ['network']),
      tool('ipv6-ula-generator', 'IPv6 ULA generator', 'ipv6-ula-generator', ['ipv6']),
    ],
  },
  {
    name: 'Math',
    components: [
      tool('math-evaluator', 'Math evaluator', 'math-evaluator', ['calculator']),
      tool('eta-calculator', 'ETA calculator', 'eta-calculator', ['time']),
      tool('percentage-calculator', 'Percentage calculator', 'percentage-calculator', ['percent']),
    ],
  },
  {
    name: 'Measurement',
    components: [
      tool('chronometer', 'Chronometer', 'chronometer', ['timer']),
      tool('temperature-converter', 'Temperature converter', 'temperature-converter', ['celsius', 'fahrenheit']),
      tool('benchmark-builder', 'Benchmark builder', 'benchmark-builder', ['performance']),
    ],
  },
  {
    name: 'Text',
    components: [
      tool('lorem-ipsum-generator', 'Lorem ipsum generator', 'lorem-ipsum-generator', ['text']),
      tool('text-statistics', 'Text statistics', 'text-statistics', ['word', 'count']),
      tool('emoji-picker', 'Emoji picker', 'emoji-picker', ['emoji']),
      tool('string-obfuscator', 'String obfuscator', 'string-obfuscator', ['text']),
      tool('text-diff', 'Text diff', 'text-diff', ['compare']),
      tool('numeronym-generator', 'Numeronym generator', 'numeronym-generator', ['i18n']),
      tool('ascii-text-drawer', 'ASCII text drawer', 'ascii-text-drawer', ['ascii']),
    ],
  },
  {
    name: 'Data',
    components: [
      tool('phone-parser-and-formatter', 'Phone parser and formatter', 'phone-parser-and-formatter', ['phone']),
      tool('iban-validator-and-parser', 'IBAN validator and parser', 'iban-validator-and-parser', ['bank']),
    ],
  },
];

export const toolsCatalog = toolsByCategory.flatMap((category) =>
  category.components.map((component) => ({
    category: category.name,
    ...component,
  })),
);

export function findToolByAlias(alias) {
  const normalized = alias.trim().replace(/^[/:\s]+/, '').toLowerCase();
  return toolsCatalog.find((tool) => tool.aliases.includes(normalized) || tool.id === normalized) || null;
}

export function searchTools(query) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return toolsCatalog;

  return toolsCatalog
    .map((tool) => {
      const haystack = [
        tool.name,
        tool.id,
        tool.category,
        ...tool.aliases,
        ...tool.keywords,
      ].join(' ').toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { tool, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .map((entry) => entry.tool);
}
```

- [ ] **Step 4: Run the catalog tests to verify they pass**

Run:

```bash
node --test apps/linows/src/js/screens/commands/tools/catalog.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/linows/src/js/screens/commands/tools/catalog.js apps/linows/src/js/screens/commands/tools/catalog.test.mjs
git commit -m "feat(linux): add it-tools catalog"
```

## Task 2: Native Tool Core

**Files:**
- Create: `apps/linows/src/js/screens/commands/tools/native/core.js`
- Test: `apps/linows/src/js/screens/commands/tools/native/core.test.mjs`

- [ ] **Step 1: Write native core tests**

Create `apps/linows/src/js/screens/commands/tools/native/core.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  base64Decode,
  base64Encode,
  convertCase,
  decodeJwt,
  formatJson,
  generateHash,
  generateRandomString,
  generateUuid,
  minifyJson,
  parseTimestamp,
  urlDecode,
  urlEncode,
} from './core.js';

test('formats and minifies JSON', () => {
  assert.equal(formatJson('{"b":1,"a":[true]}'), '{\n  "b": 1,\n  "a": [\n    true\n  ]\n}');
  assert.equal(minifyJson('{\n  "a": 1\n}'), '{"a":1}');
});

test('JSON errors are explicit', () => {
  assert.throws(() => formatJson('{'), /JSON parse failed/);
});

test('encodes and decodes Base64 UTF-8 text', () => {
  assert.equal(base64Encode('Look'), 'TG9vaw==');
  assert.equal(base64Decode('TG9vaw=='), 'Look');
});

test('rejects invalid Base64', () => {
  assert.throws(() => base64Decode('not base64%%%'), /Base64 decode failed/);
});

test('encodes and decodes URLs', () => {
  assert.equal(urlEncode('a b&c'), 'a%20b%26c');
  assert.equal(urlDecode('a%20b%26c'), 'a b&c');
});

test('generates UUID v4 format', () => {
  assert.match(generateUuid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('parses unix seconds and milliseconds', () => {
  assert.equal(parseTimestamp('0').iso, '1970-01-01T00:00:00.000Z');
  assert.equal(parseTimestamp('1000').iso, '1970-01-01T00:16:40.000Z');
  assert.equal(parseTimestamp('1700000000000').iso, '2023-11-14T22:13:20.000Z');
});

test('hashes text with SHA-256', async () => {
  assert.equal(
    await generateHash('abc', 'SHA-256'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

test('decodes JWT header and payload without verifying signature', () => {
  const jwt = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJzdWIiOiIxMjMifQ',
    'signature',
  ].join('.');
  assert.deepEqual(decodeJwt(jwt), {
    header: { alg: 'HS256', typ: 'JWT' },
    payload: { sub: '123' },
  });
});

test('converts common string cases', () => {
  assert.equal(convertCase('Hello look tools', 'camel'), 'helloLookTools');
  assert.equal(convertCase('Hello look tools', 'snake'), 'hello_look_tools');
  assert.equal(convertCase('Hello look tools', 'kebab'), 'hello-look-tools');
  assert.equal(convertCase('Hello look tools', 'pascal'), 'HelloLookTools');
});

test('generates random strings with requested alphabet', () => {
  const result = generateRandomString({ length: 24, alphabet: 'abc' });
  assert.equal(result.length, 24);
  assert.match(result, /^[abc]+$/);
});
```

- [ ] **Step 2: Run native core tests to verify they fail**

Run:

```bash
node --test apps/linows/src/js/screens/commands/tools/native/core.test.mjs
```

Expected: FAIL with `Cannot find module` for `core.js`.

- [ ] **Step 3: Implement native core functions**

Create `apps/linows/src/js/screens/commands/tools/native/core.js`:

```js
import { createHash, randomBytes, randomUUID, webcrypto } from 'node:crypto';

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

export function generateUuid() {
  return randomUUID();
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
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest(normalized, new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  if (webcrypto?.subtle) {
    const digest = await webcrypto.subtle.digest(normalized, new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return createHash(normalized.replace('-', '').toLowerCase()).update(text).digest('hex');
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

export function generateRandomString({ length = 32, alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' } = {}) {
  const size = Math.max(1, Math.min(4096, Number(length) || 32));
  const chars = String(alphabet || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
  const bytes = randomBytes(size);
  let output = '';
  for (let i = 0; i < size; i += 1) {
    output += chars[bytes[i] % chars.length];
  }
  return output;
}
```

- [ ] **Step 4: Run native core tests to verify they pass**

Run:

```bash
node --test apps/linows/src/js/screens/commands/tools/native/core.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/linows/src/js/screens/commands/tools/native/core.js apps/linows/src/js/screens/commands/tools/native/core.test.mjs
git commit -m "feat(linux): add native it-tools runners"
```

## Task 3: Browser-Compatible Native Runtime

**Files:**
- Modify: `apps/linows/src/js/screens/commands/tools/native/core.js`
- Test: `apps/linows/src/js/screens/commands/tools/native/core.test.mjs`

- [ ] **Step 1: Write runtime compatibility tests**

Append to `apps/linows/src/js/screens/commands/tools/native/core.test.mjs`:

```js
test('native core module can be imported when node crypto globals are present', async () => {
  const mod = await import(`./core.js?cache=${Date.now()}`);
  assert.equal(typeof mod.generateUuid, 'function');
  assert.equal(typeof mod.generateRandomString, 'function');
});
```

- [ ] **Step 2: Run tests**

Run:

```bash
node --test apps/linows/src/js/screens/commands/tools/native/core.test.mjs
```

Expected: PASS. If this fails in the implementation session because static Node imports are not browser-safe, continue to Step 3.

- [ ] **Step 3: Make crypto access browser-safe**

Edit the top and crypto-dependent functions in `apps/linows/src/js/screens/commands/tools/native/core.js` so no static Node import is required by WebKit:

```js
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
```

Replace `generateUuid`, `generateHash`, and `generateRandomString` with async/browser-safe versions:

```js
export async function generateUuid() {
  if (browserCrypto()?.randomUUID) return browserCrypto().randomUUID();
  const crypto = await nodeCrypto();
  if (crypto?.randomUUID) return crypto.randomUUID();
  throw new Error('UUID generation failed: crypto API unavailable');
}

export async function generateHash(input, algorithm = 'SHA-256') {
  const text = String(input ?? '');
  const normalized = algorithm.toUpperCase();
  const subtle = browserCrypto()?.subtle || (await nodeCrypto())?.webcrypto?.subtle;
  if (!subtle) throw new Error('Hash generation failed: crypto API unavailable');
  const digest = await subtle.digest(normalized, new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
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
```

Update existing tests that call `generateUuid()` and `generateRandomString()` to `await` their results.

- [ ] **Step 4: Run tests**

Run:

```bash
node --test apps/linows/src/js/screens/commands/tools/native/core.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/linows/src/js/screens/commands/tools/native/core.js apps/linows/src/js/screens/commands/tools/native/core.test.mjs
git commit -m "fix(linux): make native tools browser compatible"
```

## Task 4: Tools Panel HTML and CSS

**Files:**
- Create: `apps/linows/src/html/screens/commands/tools.html`
- Modify: `apps/linows/src/css/components/commands.css`

- [ ] **Step 1: Create the tools HTML fragment**

Create `apps/linows/src/html/screens/commands/tools.html`:

```html
<div class="cmd-panel cmd-tools-panel" id="cmd-panel-tools" hidden>
  <div class="cmd-input-bar">
    <span class="cmd-input-bar-icon" id="cmd-tools-header-icon"></span>
    <input id="cmd-tools-search" type="text" placeholder="Search it-tools..." spellcheck="false" autocomplete="off" />
    <span class="cmd-pill">/tools</span>
  </div>
  <div class="cmd-tools-layout">
    <div class="cmd-tools-list" id="cmd-tools-list"></div>
    <div class="cmd-tools-detail" id="cmd-tools-detail">
      <div class="cmd-tools-empty">Search or select an it-tools entry</div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add tools CSS**

Append to `apps/linows/src/css/components/commands.css`:

```css
/* it-tools command */
.cmd-tools-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(210px, 32%) 1fr;
  gap: 8px;
  padding: 8px;
}

.cmd-tools-list,
.cmd-tools-detail {
  min-height: 0;
  overflow: auto;
  border-radius: 8px;
  background: var(--control-fill);
}

.cmd-tools-list {
  padding: 6px;
}

.cmd-tools-category {
  padding: 8px 8px 4px;
  font-size: calc(var(--font-size) - 3px);
  text-transform: uppercase;
  letter-spacing: 0;
  color: var(--font-muted);
  font-weight: 700;
}

.cmd-tools-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
}

.cmd-tools-item-active {
  background: var(--selection-fill);
}

.cmd-tools-item-main {
  min-width: 0;
}

.cmd-tools-item-name {
  color: var(--font-color);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cmd-tools-item-meta {
  color: var(--font-secondary);
  font-size: calc(var(--font-size) - 2px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cmd-tools-badge {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: calc(var(--font-size) - 3px);
  color: var(--accent-color);
}

.cmd-tools-detail {
  padding: 10px;
}

.cmd-tools-empty,
.cmd-tools-error {
  color: var(--font-secondary);
  font-size: var(--font-size);
}

.cmd-tools-error {
  color: var(--color-danger);
}

.cmd-tool-native {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cmd-tool-native h3 {
  margin: 0;
  font-size: calc(var(--font-size) + 2px);
}

.cmd-tool-native textarea,
.cmd-tool-native input,
.cmd-tool-native select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--divider-color);
  border-radius: 6px;
  background: var(--window-fill);
  color: var(--font-color);
  font: inherit;
  padding: 8px;
}

.cmd-tool-native textarea {
  min-height: 120px;
  resize: vertical;
  font-family: var(--font-mono);
}

.cmd-tool-output {
  min-height: 96px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono);
  padding: 8px;
  border-radius: 6px;
  background: var(--window-fill);
}

.cmd-tool-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cmd-tool-actions button {
  border: 0;
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--font-color);
  background: var(--selection-fill);
  cursor: pointer;
}

.cmd-tools-web-frame {
  width: 100%;
  min-height: 360px;
  border: 0;
  border-radius: 8px;
  background: var(--window-fill);
}
```

- [ ] **Step 3: Verify CSS selectors exist in the fragment**

Run:

```bash
rg -n "cmd-tools-layout|cmd-tools-list|cmd-tools-detail|cmd-tools-web-frame" apps/linows/src/html apps/linows/src/css/components/commands.css
```

Expected: output includes both `tools.html` and `commands.css`.

- [ ] **Step 4: Commit**

```bash
git add apps/linows/src/html/screens/commands/tools.html apps/linows/src/css/components/commands.css
git commit -m "feat(linux): add it-tools panel shell"
```

## Task 5: Tools UI Controller

**Files:**
- Create: `apps/linows/src/js/screens/commands/tools/index.js`
- Create: `apps/linows/src/js/screens/commands/tools/webview.js`
- Modify: `apps/linows/src/js/icons.js`
- Modify: `apps/linows/src/js/screens/commands/index.js`
- Modify: `apps/linows/src/js/app.js`

- [ ] **Step 1: Implement web route resolver**

Create `apps/linows/src/js/screens/commands/tools/webview.js`:

```js
const BUILT_IN_BASE = 'vendor/it-tools/dist';

function cleanBase(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

export function resolveToolUrl(tool, config = {}) {
  const route = tool.route || `/${tool.id}`;
  const source = config.it_tools_web_source || 'built-in';
  const selfHosted = cleanBase(config.it_tools_self_hosted_url);

  if (source === 'self-hosted' && selfHosted) {
    return `${selfHosted}${route}`;
  }

  return `${BUILT_IN_BASE}/index.html#${route}`;
}

export function renderWebTool(tool, config = {}) {
  const url = resolveToolUrl(tool, config);
  return `
    <div class="cmd-tool-native">
      <h3>${tool.name}</h3>
      <div class="cmd-tools-item-meta">${tool.category} · web tool</div>
      <iframe class="cmd-tools-web-frame" src="${url}" title="${tool.name}"></iframe>
      <div class="cmd-tools-empty">If the embedded tool does not load, configure a self-hosted it-tools URL in Settings.</div>
    </div>
  `;
}
```

- [ ] **Step 2: Implement the tools command controller**

Create `apps/linows/src/js/screens/commands/tools/index.js`:

```js
import { EXECUTION_NATIVE, findToolByAlias, searchTools, toolsCatalog } from './catalog.js';
import {
  base64Decode,
  base64Encode,
  convertCase,
  decodeJwt,
  formatJson,
  generateHash,
  generateRandomString,
  generateUuid,
  minifyJson,
  parseTimestamp,
  urlDecode,
  urlEncode,
} from './native/core.js';
import { renderWebTool } from './webview.js';

let panel;
let searchInput;
let list;
let detail;
let selectedIndex = 0;
let currentTools = toolsCatalog;
let copyText = '';
let configProvider = () => ({});
let copyFn = async (text) => navigator.clipboard.writeText(text);
let onFeedback = () => {};

export function init({ getConfig = configProvider, copy = copyFn, feedback = onFeedback } = {}) {
  configProvider = getConfig;
  copyFn = copy;
  onFeedback = feedback;
  panel = document.getElementById('cmd-panel-tools');
  searchInput = document.getElementById('cmd-tools-search');
  list = document.getElementById('cmd-tools-list');
  detail = document.getElementById('cmd-tools-detail');

  searchInput.addEventListener('input', () => {
    currentTools = searchTools(searchInput.value);
    selectedIndex = 0;
    renderList();
    renderSelected();
  });
}

export function enter(alias = '') {
  panel.hidden = false;
  const tool = alias ? findToolByAlias(alias) : null;
  searchInput.value = tool ? tool.name : '';
  currentTools = tool ? [tool] : toolsCatalog;
  selectedIndex = 0;
  renderList();
  renderSelected();
  requestAnimationFrame(() => searchInput.focus());
}

export function exit() {
  panel.hidden = true;
}

export function handleKey(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = Math.min(currentTools.length - 1, selectedIndex + 1);
    renderList();
    renderSelected();
    return true;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = Math.max(0, selectedIndex - 1);
    renderList();
    renderSelected();
    return true;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    const button = detail.querySelector('[data-copy-result]');
    if (button && copyText) button.click();
    return true;
  }
  return false;
}

export function showFeedback(text, isError = false) {
  onFeedback(text, isError);
}

function renderList() {
  list.innerHTML = '';
  currentTools.forEach((tool, index) => {
    const row = document.createElement('div');
    row.className = `cmd-tools-item ${index === selectedIndex ? 'cmd-tools-item-active' : ''}`;
    row.innerHTML = `
      <div class="cmd-tools-item-main">
        <div class="cmd-tools-item-name">${tool.name}</div>
        <div class="cmd-tools-item-meta">${tool.category}</div>
      </div>
      <span class="cmd-tools-badge">${tool.execution === EXECUTION_NATIVE ? 'native' : 'web'}</span>
    `;
    row.addEventListener('click', () => {
      selectedIndex = index;
      renderList();
      renderSelected();
    });
    list.appendChild(row);
  });
}

function setOutput(value, isError = false) {
  copyText = isError ? '' : String(value ?? '');
  const output = detail.querySelector('[data-tool-output]');
  if (output) {
    output.textContent = String(value ?? '');
    output.classList.toggle('cmd-tools-error', isError);
  }
}

function nativeTemplate(tool, controls = '') {
  detail.innerHTML = `
    <div class="cmd-tool-native">
      <h3>${tool.name}</h3>
      <div class="cmd-tools-item-meta">${tool.category} · native tool</div>
      ${controls || '<textarea data-tool-input spellcheck="false" placeholder="Input"></textarea>'}
      <div class="cmd-tool-output" data-tool-output></div>
      <div class="cmd-tool-actions">
        <button data-copy-result>Copy result</button>
      </div>
    </div>
  `;
  detail.querySelector('[data-copy-result]').addEventListener('click', async () => {
    if (!copyText) return;
    await copyFn(copyText);
    onFeedback('Result copied', false);
  });
}

function renderSelected() {
  const tool = currentTools[selectedIndex];
  copyText = '';
  if (!tool) {
    detail.innerHTML = '<div class="cmd-tools-empty">No matching tools</div>';
    return;
  }
  if (tool.execution !== EXECUTION_NATIVE) {
    detail.innerHTML = renderWebTool(tool, configProvider());
    return;
  }
  renderNativeTool(tool);
}

function renderNativeTool(tool) {
  if (tool.id === 'uuid-generator') {
    nativeTemplate(tool, '<button data-generate-uuid>Generate UUID</button>');
    const generate = async () => setOutput(await generateUuid());
    detail.querySelector('[data-generate-uuid]').addEventListener('click', generate);
    generate();
    return;
  }

  if (tool.id === 'token-generator') {
    nativeTemplate(tool, `
      <input data-random-length type="number" min="1" max="4096" value="32" />
      <input data-random-alphabet value="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" />
      <button data-generate-random>Generate random string</button>
    `);
    const generate = async () => {
      const length = detail.querySelector('[data-random-length]').value;
      const alphabet = detail.querySelector('[data-random-alphabet]').value;
      setOutput(await generateRandomString({ length, alphabet }));
    };
    detail.querySelector('[data-generate-random]').addEventListener('click', generate);
    generate();
    return;
  }

  const controls = tool.id === 'case-converter'
    ? '<select data-case-mode><option value="camel">camelCase</option><option value="snake">snake_case</option><option value="kebab">kebab-case</option><option value="pascal">PascalCase</option><option value="upper">UPPER_SNAKE</option><option value="lower">lower words</option></select><textarea data-tool-input spellcheck="false" placeholder="Input"></textarea>'
    : '<textarea data-tool-input spellcheck="false" placeholder="Input"></textarea>';

  nativeTemplate(tool, controls);
  const input = detail.querySelector('[data-tool-input]');
  const mode = detail.querySelector('[data-case-mode]');

  const render = async () => {
    try {
      const value = input.value;
      if (!value && !['hash-text', 'base64-string-converter', 'url-encoder'].includes(tool.id)) {
        setOutput('');
        return;
      }
      if (tool.id === 'json-format') setOutput(formatJson(value));
      if (tool.id === 'base64-string-converter') setOutput(`Encode:\n${base64Encode(value)}\n\nDecode:\n${value ? base64Decode(value) : ''}`);
      if (tool.id === 'url-encoder') setOutput(`Encode:\n${urlEncode(value)}\n\nDecode:\n${value ? urlDecode(value) : ''}`);
      if (tool.id === 'date-time-converter') {
        const parsed = parseTimestamp(value);
        setOutput(`ISO: ${parsed.iso}\nLocal: ${parsed.local}\nUnix seconds: ${parsed.unixSeconds}\nUnix milliseconds: ${parsed.unixMilliseconds}`);
      }
      if (tool.id === 'hash-text') setOutput(await generateHash(value, 'SHA-256'));
      if (tool.id === 'jwt-parser') setOutput(JSON.stringify(decodeJwt(value), null, 2));
      if (tool.id === 'case-converter') setOutput(convertCase(value, mode.value));
    } catch (err) {
      setOutput(err.message, true);
    }
  };

  input.addEventListener('input', render);
  if (mode) mode.addEventListener('change', render);
  render();
}
```

- [ ] **Step 3: Register tools in the command index**

Add a `toolbox` export to `apps/linows/src/js/icons.js`:

```js
export const toolbox = s('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.1-3.1a6 6 0 0 1-7.9 7.9l-6 6a2.1 2.1 0 0 1-3-3l6-6a6 6 0 0 1 7.9-7.9l-3.1 3.1z"/>');
```

Modify `apps/linows/src/js/screens/commands/index.js`:

```js
import * as tools from './tools/index.js';
import { calculator, timer, xCircle, terminal, info, toolbox } from '../../icons.js';
```

Add this entry to `COMMANDS` after `sys`:

```js
{ id: 'tools', label: '/tools', shortcut: '6', detail: 'Developer tools...', icon: toolbox, module: tools },
```

Change `init` to pass options into tools:

```js
export function init(contentAreaEl, inputEl, { onExitMode, onExecuteCommand, onGetIcon, onGetConfig, onCopyText, onFeedback }) {
```

Add:

```js
tools.init({
  getConfig: onGetConfig,
  copy: onCopyText,
  feedback: onFeedback,
});
```

Change Ctrl-number handling from `Ctrl+1..5` to dynamic command count:

```js
if (e.ctrlKey && !e.shiftKey && e.key >= '1' && e.key <= String(COMMANDS.length)) {
```

- [ ] **Step 4: Load the tools fragment and pass app hooks**

Modify `apps/linows/src/js/app.js`.

Add `tools.html` to the command panel loading list:

```js
load('html/screens/commands/tools.html', cmdMain),
```

Pass config and copy hooks to `commands.init`:

```js
commands.init(contentArea, queryInput, {
  onExitMode: exitCommandMode,
  onExecuteCommand: executeCommand,
  onGetIcon: getIcon,
  onGetConfig: getConfigMapFromCache,
  onCopyText: async (text) => copyToClipboard(text),
  onFeedback: (message, isError) => banner.show(message, isError ? 'error' : 'success', BANNER_DURATION_SHORT),
});
```

Add this helper near `executeCommand`:

```js
let latestConfigMap = {};

async function refreshConfigMap() {
  const cfg = await getConfig();
  latestConfigMap = Object.fromEntries(cfg.entries.map((entry) => [entry.key, entry.value]));
  return latestConfigMap;
}

function getConfigMapFromCache() {
  return latestConfigMap;
}
```

Call `refreshConfigMap();` after the existing `getConfig().then(...)` block for running apps.

Update `settings.setOnConfigReload` to keep the cache current:

```js
settings.setOnConfigReload((map) => {
  latestConfigMap = map;
  const on = (map.running_apps_placement || 'right') !== 'none';
  runningApps.setEnabled(on);
  if (on) runningApps.refresh();
});
```

- [ ] **Step 5: Run static import checks**

Run:

```bash
node --check apps/linows/src/js/screens/commands/tools/index.js
node --check apps/linows/src/js/screens/commands/index.js
node --check apps/linows/src/js/app.js
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/linows/src/js/screens/commands/tools/index.js apps/linows/src/js/screens/commands/tools/webview.js apps/linows/src/js/icons.js apps/linows/src/js/screens/commands/index.js apps/linows/src/js/app.js
git commit -m "feat(linux): wire it-tools command panel"
```

## Task 6: Command Aliases

**Files:**
- Modify: `apps/linows/src/js/screens/commands/index.js`
- Modify: `apps/linows/src/js/app.js`
- Test: `apps/linows/src/js/screens/commands/tools/catalog.test.mjs`

- [ ] **Step 1: Add alias coverage tests**

Append to `apps/linows/src/js/screens/commands/tools/catalog.test.mjs`:

```js
test('all direct command aliases are native tools', () => {
  for (const alias of ['json', 'base64', 'url', 'uuid', 'timestamp', 'hash', 'jwt', 'case', 'random']) {
    const tool = findToolByAlias(alias);
    assert.equal(tool.execution, 'native', alias);
  }
});
```

- [ ] **Step 2: Run the alias test**

Run:

```bash
node --test apps/linows/src/js/screens/commands/tools/catalog.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Add alias entry support in command index**

In `apps/linows/src/js/screens/commands/index.js`, add:

```js
const ALIAS_TO_COMMAND = {
  json: { command: 'tools', alias: 'json' },
  base64: { command: 'tools', alias: 'base64' },
  url: { command: 'tools', alias: 'url' },
  uuid: { command: 'tools', alias: 'uuid' },
  timestamp: { command: 'tools', alias: 'timestamp' },
  hash: { command: 'tools', alias: 'hash' },
  jwt: { command: 'tools', alias: 'jwt' },
  case: { command: 'tools', alias: 'case' },
  random: { command: 'tools', alias: 'random' },
};

let pendingAlias = '';

export function enterAlias(alias) {
  const target = ALIAS_TO_COMMAND[alias];
  if (!target) return false;
  pendingAlias = target.alias;
  activeCommandId = target.command;
  return true;
}
```

Change `enter()` so tools receives the pending alias:

```js
const alias = pendingAlias;
pendingAlias = '';
currentModule().enter(alias);
```

- [ ] **Step 4: Expand command prefix map**

In `apps/linows/src/js/app.js`, replace `CMD_PREFIX_MAP` with:

```js
const CMD_PREFIX_MAP = {
  calc: { command: 'calc' },
  pomo: { command: 'pomo' },
  kill: { command: 'kill' },
  shell: { command: 'shell' },
  sys: { command: 'sys' },
  tools: { command: 'tools' },
  json: { alias: 'json' },
  base64: { alias: 'base64' },
  url: { alias: 'url' },
  uuid: { alias: 'uuid' },
  timestamp: { alias: 'timestamp' },
  hash: { alias: 'hash' },
  jwt: { alias: 'jwt' },
  case: { alias: 'case' },
  random: { alias: 'random' },
};
```

Update `tryCommandPrefix`:

```js
const target = CMD_PREFIX_MAP[cmdName.toLowerCase()];
if (!target) return false;
if (target.alias) {
  commands.enterAlias(target.alias);
} else {
  commands.enterById(target.command);
}
enterCommandMode();
```

- [ ] **Step 5: Run checks**

Run:

```bash
node --test apps/linows/src/js/screens/commands/tools/catalog.test.mjs
node --check apps/linows/src/js/screens/commands/index.js
node --check apps/linows/src/js/app.js
```

Expected: PASS and exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/linows/src/js/screens/commands/tools/catalog.test.mjs apps/linows/src/js/screens/commands/index.js apps/linows/src/js/app.js
git commit -m "feat(linux): add it-tools command aliases"
```

## Task 7: Settings and Config

**Files:**
- Modify: `apps/linows/src-tauri/src/default_config.txt`
- Modify: `apps/linows/src/html/screens/settings.html`
- Modify: `apps/linows/src/js/screens/settings.js`

- [ ] **Step 1: Add default config keys**

Append to `apps/linows/src-tauri/src/default_config.txt`:

```txt

# it-tools
it_tools_web_source=built-in
it_tools_self_hosted_url=
```

- [ ] **Step 2: Add settings HTML controls**

In `apps/linows/src/html/screens/settings.html`, add this section near other advanced/developer settings:

```html
<section class="settings-section">
  <h2>it-tools</h2>
  <div class="settings-row">
    <div>
      <div class="settings-label">Web source</div>
      <div class="settings-help">Built-in assets are used by default. Self-hosted uses your configured URL.</div>
    </div>
    <select id="settings-it-tools-source" class="settings-select">
      <option value="built-in">Built-in</option>
      <option value="self-hosted">Self-hosted</option>
    </select>
  </div>
  <div class="settings-row">
    <div>
      <div class="settings-label">Self-hosted URL</div>
      <div class="settings-help">Example: http://localhost:8080</div>
    </div>
    <input id="settings-it-tools-url" class="settings-input" type="text" spellcheck="false" placeholder="http://localhost:8080" />
  </div>
</section>
```

- [ ] **Step 3: Wire settings load/save**

In `apps/linows/src/js/screens/settings.js`, inside `loadConfig`, set the controls:

```js
document.getElementById('settings-it-tools-source').value = map.it_tools_web_source || 'built-in';
document.getElementById('settings-it-tools-url').value = map.it_tools_self_hosted_url || '';
```

Inside `init`, add listeners:

```js
document.getElementById('settings-it-tools-source')?.addEventListener('change', async (e) => {
  await saveConfig({ it_tools_web_source: e.target.value });
});

document.getElementById('settings-it-tools-url')?.addEventListener('change', async (e) => {
  await saveConfig({ it_tools_self_hosted_url: e.target.value.trim() });
});
```

- [ ] **Step 4: Run syntax checks**

Run:

```bash
node --check apps/linows/src/js/screens/settings.js
cargo test --manifest-path apps/linows/src-tauri/Cargo.toml config
```

Expected: `node --check` exits 0. `cargo test` exits 0 or reports no matching tests without compile errors.

- [ ] **Step 5: Commit**

```bash
git add apps/linows/src-tauri/src/default_config.txt apps/linows/src/html/screens/settings.html apps/linows/src/js/screens/settings.js
git commit -m "feat(linux): add it-tools web source settings"
```

## Task 8: Vendored Asset Boundary

**Files:**
- Create: `apps/linows/src/vendor/it-tools/README.md`
- Create: `apps/linows/src/vendor/it-tools/.gitkeep`

- [ ] **Step 1: Create vendor documentation**

Create `apps/linows/src/vendor/it-tools/README.md`:

```md
# Vendored it-tools Assets

This directory is reserved for the built static assets of `it-tools`.

Upstream: https://github.com/CorentinTh/it-tools
License: GPL-3.0

When assets are vendored, record:

- Upstream commit SHA
- Build command
- Asset copy command
- License file location
- Source retrieval instructions

Look must preserve the upstream license and source attribution when distributing a build that contains these assets.
```

Create `apps/linows/src/vendor/it-tools/.gitkeep` as an empty file.

- [ ] **Step 2: Verify vendor docs are present**

Run:

```bash
test -f apps/linows/src/vendor/it-tools/README.md
test -f apps/linows/src/vendor/it-tools/.gitkeep
```

Expected: both commands exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/linows/src/vendor/it-tools/README.md apps/linows/src/vendor/it-tools/.gitkeep
git commit -m "docs(linux): document it-tools vendor boundary"
```

## Task 9: Integration Verification

**Files:**
- Modify only if verification finds defects in files changed by Tasks 1-8.

- [ ] **Step 1: Run frontend logic tests**

Run:

```bash
node --test apps/linows/src/js/screens/commands/tools/catalog.test.mjs apps/linows/src/js/screens/commands/tools/native/core.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run frontend syntax checks**

Run:

```bash
node --check apps/linows/src/js/app.js
node --check apps/linows/src/js/screens/commands/index.js
node --check apps/linows/src/js/screens/commands/tools/index.js
node --check apps/linows/src/js/screens/commands/tools/webview.js
node --check apps/linows/src/js/screens/settings.js
```

Expected: all commands exit 0.

- [ ] **Step 3: Run Rust checks for Tauri app**

Run:

```bash
cargo test --manifest-path apps/linows/src-tauri/Cargo.toml
```

Expected: PASS.

- [ ] **Step 4: Run the Linux app manually**

Run:

```bash
cd apps/linows/src-tauri
cargo tauri dev
```

Expected: Look opens. Open the command panel through the existing platform entry. Verify:

- `/tools` opens the catalog.
- Searching `json` selects a native JSON tool.
- `:json {"a":1}` enters the JSON alias path.
- `/random` or `:random` shows a generated random string.
- A web-only tool such as QR code generator renders the embedded iframe state.
- Settings can set `it_tools_web_source=self-hosted` and `it_tools_self_hosted_url=http://localhost:8080`.

- [ ] **Step 5: Fix defects found during verification**

If a verification step fails, make the smallest correction in the relevant changed file and rerun the exact failing command. Example for a syntax issue in `tools/index.js`:

```bash
node --check apps/linows/src/js/screens/commands/tools/index.js
```

Expected after the fix: exit 0.

- [ ] **Step 6: Commit verification fixes**

If Step 5 changed files:

```bash
git add apps/linows/src/js apps/linows/src/html apps/linows/src/css apps/linows/src-tauri/src apps/linows/src/vendor
git commit -m "fix(linux): stabilize it-tools command panel"
```

If Step 5 changed no files, do not create an empty commit.
