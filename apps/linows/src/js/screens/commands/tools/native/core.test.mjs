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

test('generates UUID v4 format', async () => {
  assert.match(await generateUuid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
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

test('generates random strings with requested alphabet', async () => {
  const result = await generateRandomString({ length: 24, alphabet: 'abc' });
  assert.equal(result.length, 24);
  assert.match(result, /^[abc]+$/);
});

test('native core module can be imported when node crypto globals are present', async () => {
  const mod = await import(`./core.js?cache=${Date.now()}`);
  assert.equal(typeof mod.generateUuid, 'function');
  assert.equal(typeof mod.generateRandomString, 'function');
});
