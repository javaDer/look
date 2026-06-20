import { EXECUTION_NATIVE, findToolByAlias, searchTools, toolsByCategory, toolsCatalog } from './catalog.js';
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
  if (e.key === 'Escape') {
    if (searchInput.value.trim()) {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      return true;
    }
    return false;
  }
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
  const isSearching = searchInput.value.trim().length > 0;

  if (isSearching) {
    // Flat search results
    if (currentTools.length === 0) {
      list.innerHTML = '<div class="cmd-tools-empty">No matching tools</div>';
      return;
    }
    const count = document.createElement('div');
    count.className = 'cmd-tools-category';
    count.textContent = `${currentTools.length} tool${currentTools.length > 1 ? 's' : ''} found`;
    list.appendChild(count);
    currentTools.forEach((tool, index) => appendToolRow(tool, index));
  } else {
    // Grouped by category
    let globalIndex = 0;
    for (const cat of toolsByCategory) {
      const matched = cat.components.filter((t) => currentTools.includes(t));
      if (matched.length === 0) continue;
      const header = document.createElement('div');
      header.className = 'cmd-tools-category';
      header.textContent = cat.name;
      list.appendChild(header);
      for (const tool of matched) {
        appendToolRow(tool, globalIndex++);
      }
    }
  }
}

function appendToolRow(tool, index) {
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
