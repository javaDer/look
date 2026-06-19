# it-tools Command Panel Integration Design

## Goal

Embed the full it-tools catalog into Look's command panel with a Linux-first implementation and a macOS-compatible design. The first version should make every it-tools entry discoverable from Look, while implementing a focused set of high-frequency tools as native command-panel experiences.

## Scope

The first version targets Linux implementation first because the current development platform is Ubuntu and the Linux command panel is already HTML/CSS/JS inside the Tauri app. macOS is designed against the same catalog and execution model so it can be implemented without creating a separate tool taxonomy.

Windows is out of scope for the first implementation pass.

The design does not introduce or require a new global shortcut. Users enter the command panel through Look's existing platform-specific entry path, then select `/tools` or use a native tool alias such as `/json`, `/base64`, or `/random`.

## Selected Approach

Use a hybrid catalog and alias model.

`/tools` is the unified entry point. It exposes the complete it-tools catalog, with search, category grouping, keywords, and detail panels. Every tool has metadata describing its id, display name, category, keywords, execution kind, and upstream it-tools route.

High-frequency tools are also registered as direct aliases. These aliases open native command-panel panels and provide immediate keyboard-first input, preview, and copy behavior.

Tools that are not native in the first version open through an embedded it-tools web container. The web container loads vendored it-tools static assets first, then falls back to a user-configured self-hosted URL.

## Native Tool Set

The first native set is:

- JSON format and minify
- Base64 encode and decode
- URL encode and decode
- UUID generation
- Timestamp conversion
- Hash generation
- JWT decode
- Case converter
- Random string generation

All other it-tools entries are available through the embedded web tool path in the first version.

## Linux Components

The Linux implementation adds a tools area alongside the existing command modules under `apps/linows/src/js/screens/commands`.

`tools/index.js` owns the `/tools` catalog screen, search, filtering, category grouping, selected-tool state, and routing into native or web execution.

`tools/catalog.js` provides the tool metadata. The implementation should avoid hand-maintaining separate Linux and macOS catalogs. If a generated artifact is practical, this catalog should be generated into JSON or platform constants from one source.

`tools/native/*.js` contains native implementations for the first native set. Native tools should expose a small common interface: initialize, enter, exit, handle key input, render preview, copy result, and report errors.

`tools/webview.js` loads vendored it-tools static resources for web-only tools. It also handles fallback to a configured self-hosted URL and reports load failures in the panel.

Settings add two it-tools preferences:

- Preferred web source: built-in or self-hosted
- Self-hosted base URL

The default is built-in assets first, with no public remote fallback.

## macOS Compatibility Design

macOS should follow the same concepts and names:

- `ItToolsCatalog`
- `ItToolExecutionKind`
- `NativeToolRunner`
- `ItToolsWebContainer`

The catalog entries and execution kinds must match Linux. macOS native panels can be implemented in SwiftUI, while web-only tools use a WebView container. The macOS implementation is allowed to land after the Linux version, but it should not require changing the catalog shape.

## User Flow

The user opens Look's command panel using the existing platform behavior.

From there, the user can choose `/tools` to browse or search the complete tool catalog. Selecting a native tool opens a native panel with input, preview, and copy actions. Selecting a web-only tool opens the embedded it-tools route in the command panel.

The user can also use direct aliases for the first native set. For example, `/json` opens the JSON tool, `/base64` opens Base64, and `/random` opens random string generation.

## Error Handling and Fallbacks

Native tool errors render inline inside the command panel. JSON parse failures, JWT decode failures, invalid Base64, and invalid timestamp inputs should show specific, local errors without system dialogs.

Empty input should be stable. Tools either show an empty result, a default generated value, or a clear placeholder state depending on the tool.

Web tools use this fallback order:

1. Built-in vendored it-tools static assets
2. Configured self-hosted URL
3. Inline error state with retry and settings guidance

The app must not silently fall back to a public hosted website. A public URL can be documented later as a user-configured self-hosted value, but it is not the default.

## Licensing and Packaging

it-tools is GPLv3. Vendoring it-tools static assets requires preserving license information, source attribution, upstream version, and source retrieval instructions. The implementation should keep the vendored asset boundary explicit so release packaging can audit it.

The design assumes Look's licensing and distribution constraints are reviewed before shipping a vendored it-tools build.

## Testing

Linux native tools need focused tests for normal input, empty input, invalid input, and copy-result formatting. The first test set should cover JSON, Base64, URL encode/decode, UUID, timestamp, hash, JWT decode, case conversion, and random string generation.

Command panel integration tests should verify:

- `/tools` shows the catalog
- Search matches names, aliases, and keywords
- Native tools open from the catalog
- Native aliases open the correct tools
- Web-only tools load from the built-in asset route
- Missing built-in assets show fallback state without crashing
- Self-hosted URL configuration is read and used

macOS should initially include catalog shape checks. SwiftUI panel and WebView tests can be added when the macOS UI implementation lands.

## Non-goals

The first version does not reimplement every it-tools feature natively.

The first version does not require Windows support.

The first version does not add or change global command-panel shortcuts.

The first version does not use a public remote it-tools website as an automatic fallback.
