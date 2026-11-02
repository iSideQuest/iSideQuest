# SideKick editing notes

- Read `../docs/sidekick/PROJECT-GUIDE.md` for the architecture, dependency map, test baseline, and token-efficient workflow.
- Source of truth is `C:\Users\brian\Desktop\SideKick\`; this folder is the GitHub Pages deploy copy.
- The app is mostly one inline module in `index.html`; extracted systems are CSS, sound/device behavior, translation data, static feature data, and Collection persistence (`js/collection-store.js`). Collection UI/search/edit/photo behavior remains in the app module.
- Search exact symbols and inspect narrow ranges; avoid dumping all of `index.html` into AI context.
- Preserve existing behavior. Check ES-module imports/exports and classic-script/inline-handler `window` bridges explicitly.
- `collection-store.js` must not import the app entry point or Firebase SDK; its Firebase/user access is injected from `index.html`.
- After JS changes, syntax-check the extracted inline module and changed JS files, inspect the diff, then run relevant guide smoke tests.
- Do not bump, copy, commit, or push a release unless the task requests deployment.
