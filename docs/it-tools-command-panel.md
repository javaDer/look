# it-tools Command Panel — 实现文档

## 概述

为 Look Linux 桌面启动器新增 `/tools` 命令面板，集成 it-tools 全部 80+ 个开发工具，支持原生工具（本地 JS 运行）和 Web 工具（iframe 渲染），默认中文界面。

## 文件变更

### 新增文件

| 文件 | 用途 |
|------|------|
| `apps/linows/src/js/screens/commands/tools/catalog.js` | it-tools 目录数据：10 个分类、80+ 工具条目、别名、搜索 |
| `apps/linows/src/js/screens/commands/tools/catalog.test.mjs` | 目录单元测试（6 项） |
| `apps/linows/src/js/screens/commands/tools/native/core.js` | 原生工具函数：JSON、Base64、URL、UUID、时间戳、哈希、JWT、大小写转换、随机字符串（浏览器安全，动态加载 node:crypto） |
| `apps/linows/src/js/screens/commands/tools/native/core.test.mjs` | 原生工具测试（12 项） |
| `apps/linows/src/js/screens/commands/tools/index.js` | `/tools` 命令 UI 控制器：分类列表、搜索、选择、原生/Web 渲染 |
| `apps/linows/src/js/screens/commands/tools/webview.js` | Web 工具路由解析 + iframe 渲染 |
| `apps/linows/src/html/screens/commands/tools.html` | 命令面板 HTML 片段 |
| `apps/linows/src/vendor/it-tools/README.md` | Vendor 资产文档：上游信息、构建命令 |
| `apps/linows/src/vendor/it-tools/bridge.html` | 语言桥接页：设置 localStorage 后加载 it-tools |
| `apps/linows/src/vendor/it-tools/dist/` | it-tools 构建产物（gitignore，14MB） |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `apps/linows/src/js/icons.js` | 新增 `toolbox` SVG 图标 |
| `apps/linows/src/js/screens/commands/index.js` | 注册 `/tools` 命令、9 个别名（`ALIAS_TO_COMMAND`）、`enterAlias`、动态 Ctrl+1-6 |
| `apps/linows/src/js/app.js` | 加载 tools.html、扩展 `CMD_PREFIX_MAP`（14 条）、配置缓存、更新提示栏 |
| `apps/linows/src/css/components/commands.css` | 新增 it-tools 面板 CSS（~180 行）：网格布局、工具列表、分类标题、原生控件、iframe |
| `apps/linows/src/html/screens/settings.html` | 新增 it-tools 设置区域（Web 来源、语言、自托管 URL） |
| `apps/linows/src/js/screens/settings.js` | 加载/保存 `it_tools_web_source`、`it_tools_lang`、`it_tools_self_hosted_url` |
| `apps/linows/src-tauri/src/default_config.txt` | 新增 3 个默认配置键 |
| `apps/linows/src-tauri/tauri.conf.json` | bundle targets 新增 `dmg` |

## 功能特性

### 命令入口
- `Ctrl+/` → 命令模式 → `Ctrl+6` 或点击 `/tools`
- 命令栏输入 `:tools` 或搜索 `/tools`

### 别名直通
输入别名直接进入对应工具：
- `:json` → JSON 格式化
- `:base64` → Base64 编解码
- `:url` → URL 编解码
- `:uuid` → UUID 生成器
- `:timestamp` → 时间戳转换
- `:hash` → 文本哈希
- `:jwt` → JWT 解析
- `:case` → 大小写转换
- `:random` → 随机字符串生成

### 原生工具（9 个）
纯 JavaScript 实现，无需加载外部资源：
- JSON 格式化/压缩
- Base64 编解码
- URL 编解码
- UUID v4 生成
- 时间戳转换（秒/毫秒 → ISO/Local）
- SHA-256 哈希
- JWT 解析（不验证签名）
- 大小写转换（camel/snake/kebab/pascal/upper/lower）
- 随机字符串生成（可调长度和字母表）

### Web 工具（70+ 个）
通过 iframe 加载 vendored it-tools 构建产物，包括：
- Crypto：Bcrypt、HMAC、RSA、密码强度分析等
- Converter：颜色、进制、YAML/JSON/TOML/XML 互转、Markdown→HTML
- Web：HTML entities、设备信息、OTP、MIME、Slugify 等
- Images：QR 生成、WiFi QR、SVG 占位图、摄像头
- Development：Git memo、Cron、SQL 美化、chmod、Docker、Regex
- Network：IPv4 子网、MAC 查找/生成、IPv6
- Math：数学计算、ETA、百分比
- Measurement：秒表、温度转换、基准测试
- Text：Lorem ipsum、文本统计、Emoji、Diff
- Data：电话号码解析、IBAN 验证

### 键盘操作
- `↑` / `↓` — 浏览工具列表（跳过分类标题）
- `Enter` — 复制结果
- `Esc` — 先清除搜索，再按退出命令模式
- 原生工具：输入文本框即实时渲染结果

## 架构设计

```
tools/
  catalog.js          # 纯数据层：工具定义、搜索、别名解析
  index.js            # UI 控制器：列表渲染、键盘处理、状态管理
  webview.js          # Web 工具路由：bridge 跳转、iframe URL 构造
  native/
    core.js           # 原生工具函数：浏览器安全的 crypto API
    core.test.mjs     # 单元测试
  catalog.test.mjs    # 单元测试

vendor/it-tools/
  bridge.html         # localStorage 语言注入 → 跳转 it-tools
  dist/               # it-tools 构建产物（hash 路由 + 相对路径）
  README.md           # Vendor 文档
```

### 关键设计决策

1. **浏览器安全的 crypto** — `node:crypto` 通过动态 `import()` 加载，WebKit WebView 中回退到 `globalThis.crypto`，避免静态 Node.js 导入导致浏览器报错。

2. **Hash 路由** — it-tools 源码的 `createWebHistory` 改为 `createWebHashHistory`，因为 Tauri 静态文件服务不支持 SPA fallback。桥接页将路由写入 URL hash。

3. **相对资源路径** — it-tools 以 `--base=./` 构建，确保 JS/CSS 资产路径（`./assets/xxx.js`）在 iframe 中正确解析。

4. **语言注入** — bridge.html 在加载 it-tools 之前设置 `localStorage.setItem('locale', lang)`，it-tools 通过 `@vueuse/core` 的 `useStorage('locale', ...)` 读取。

5. **配置缓存** — `app.js` 维护 `latestConfigMap` 对象，避免每次工具切换都异步读取 Tauri 配置。

## 配置项

| 键 | 默认值 | 说明 |
|----|--------|------|
| `it_tools_web_source` | `built-in` | Web 工具来源：`built-in`（内置）/ `self-hosted`（自托管） |
| `it_tools_lang` | `zh-CN` | 界面语言：zh-CN / en / fr / de / ja / ko / es / pt / ru |
| `it_tools_self_hosted_url` | （空） | 自托管 it-tools 地址，如 `http://localhost:8080` |

## 打包说明

### macOS

```bash
# 开发运行
cd apps/linows/src-tauri && cargo tauri dev

# 构建 DMG（需要 create-dmg: brew install create-dmg）
cargo tauri build --bundles dmg
# 产物: target/release/bundle/dmg/Look_0.6.4_aarch64.dmg
```

### Linux

```bash
# 开发运行
cd apps/linows/src-tauri && cargo tauri dev

# 构建 .deb（需要 webkit2gtk 等依赖）
cargo tauri build --bundles deb
# 产物: target/release/bundle/deb/look_0.6.4_amd64.deb
```

### 更新 vendored it-tools

```bash
git clone https://github.com/CorentinTh/it-tools.git
cd it-tools
git checkout <upstream-commit>
npm install --legacy-peer-deps
npm install date-fns@4.4.0 --legacy-peer-deps  # 修复 date-fns-tz 兼容性
# 修改 src/router.ts:
#   import { createRouter, createWebHashHistory } from 'vue-router';
#   history: createWebHashHistory(),
NODE_OPTIONS=--max_old_space_size=4096 npx vite build --base=./
cp -r dist/ <look>/apps/linows/src/vendor/it-tools/dist/
```

### 注意事项
- `vendor/it-tools/dist/` 被 `.gitignore` 排除，不作为 Git 跟踪文件
- 打包时 Tauri 从文件系统复制 `apps/linows/src/` 全部内容，包括 vendor dist
- it-tools 上游许可证：GPL-3.0，分发时需保留许可和来源归属

## 测试

```bash
# 前端单元测试（18 项）
node --test apps/linows/src/js/screens/commands/tools/catalog.test.mjs \
            apps/linows/src/js/screens/commands/tools/native/core.test.mjs

# Rust 测试（25 项）
cargo test --manifest-path apps/linows/src-tauri/Cargo.toml
```

## 提交历史

```
33daadf refactor(linux): improve it-tools list UX with category headers and search
0dd40f9 fix(linux): fix Chinese locale key and optimize web tool iframe layout
5470dae fix(linux): use hash routing and fix web tool route paths
614ecb1 fix(linux): rebuild it-tools with relative asset paths for iframe
e5ea602 feat(linux): vendor it-tools assets and add Chinese language support
a1c3df8 docs(linux): document it-tools vendor boundary
6ff119d feat(linux): add it-tools web source settings
5cacbbe feat(linux): wire it-tools command panel with aliases
f48df9c feat(linux): add it-tools panel shell
2b39ad8 feat(linux): add native it-tools runners with browser-safe crypto
e1a2fb0 feat(linux): add it-tools catalog
```
