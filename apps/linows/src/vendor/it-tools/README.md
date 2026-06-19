# Vendored it-tools Assets

This directory contains the built static assets of `it-tools`.

Upstream: https://github.com/CorentinTh/it-tools
License: GPL-3.0

## Build Info

- Upstream commit: `d505845f918e946ec300af7b36efc107e2f66e9e`
- Build command: `NODE_OPTIONS=--max_old_space_size=4096 npx vite build --base=./ --base=./`
- Build host: node v22.22.3 (macOS arm64)
- Build date: 2026-06-19

## Rebuild

```bash
git clone https://github.com/CorentinTh/it-tools.git
cd it-tools
git checkout d505845f918e946ec300af7b36efc107e2f66e9e
npm install --legacy-peer-deps
npm install date-fns@4.4.0 --legacy-peer-deps  # fix date-fns-tz compat
NODE_OPTIONS=--max_old_space_size=4096 npx vite build --base=./
cp -r dist/ <look>/apps/linows/src/vendor/it-tools/dist/
```

Look must preserve the upstream license and source attribution when distributing a build that contains these assets.
