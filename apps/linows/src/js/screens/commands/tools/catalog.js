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
      tool('json-format', 'JSON format / minify', 'json-format', ['format', 'prettify'], ['json']),
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
      tool('json-viewer', 'JSON viewer', 'json-viewer', ['format', 'prettify']),
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
