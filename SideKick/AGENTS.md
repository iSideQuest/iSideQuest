# SideKick editing notes

- Read `../docs/sidekick/PROJECT-GUIDE.md` for the architecture, dependency map, test baseline, and token-efficient workflow.
- Source of truth is `C:\Users\brian\Desktop\SideKick\`; this folder is the GitHub Pages deploy copy.
- The app is mostly one inline module in `index.html`; extracted systems include CSS, sound/device behavior, translation/feature data, and Collection store/list/editor/discovery/photo modules (`js/collection-*.js`). Collection HTML markup remains inline.
- Search exact symbols and inspect narrow ranges; avoid dumping all of `index.html` into AI context.
- Preserve existing behavior. Check ES-module imports/exports and classic-script/inline-handler `window` bridges explicitly.
- `collection-store.js` must not import the app entry point or Firebase SDK; its Firebase/user access is injected from `index.html`.
- `collection-list.js` depends only on `collection-store.js` plus injected app callbacks; keep the Friends read-only card-builder use compatible.
- `collection-editor.js` depends only on collection store/list plus injected app callbacks; do not import `index.html` or Firebase SDKs into the feature module.
- `collection-discovery.js` uses injected Firebase readers/editor/UPC callbacks; access Quagga via `window` and do not import Firebase SDKs.
- `collection-photo.js` owns photo state and crop/browser APIs; it must not import the editor or app entry. Keep editor/photo integration as injected callbacks.
- After JS changes, syntax-check the extracted inline module and changed JS files, inspect the diff, then run relevant guide smoke tests.
- Do not bump, copy, commit, or push a release unless the task requests deployment.
