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

test('all direct command aliases are native tools', () => {
  for (const alias of ['json', 'base64', 'url', 'uuid', 'timestamp', 'hash', 'jwt', 'case', 'random']) {
    const tool = findToolByAlias(alias);
    assert.equal(tool.execution, 'native', alias);
  }
});

test('search matches names, aliases, keywords, and categories', () => {
  assert.equal(searchTools('json format')[0].id, 'json-format');
  assert.equal(searchTools('random string')[0].id, 'token-generator');
  assert.ok(searchTools('network').some((tool) => tool.id === 'ipv4-subnet-calculator'));
  assert.ok(searchTools('base64').some((tool) => tool.id === 'base64-string-converter'));
});
