const BUILT_IN_BASE = 'vendor/it-tools';

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

  const lang = config.it_tools_lang || 'zh-CN';
  return `${BUILT_IN_BASE}/bridge.html?lang=${encodeURIComponent(lang)}&route=${encodeURIComponent(route)}`;
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
