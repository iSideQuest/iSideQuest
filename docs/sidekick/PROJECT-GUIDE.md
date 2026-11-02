# SideKick project guide

Reviewed 2026-11-02. Scope: the SideKick PWA, not the other projects in the workspace.

## Architecture snapshot

- **Frontend:** static HTML/CSS and browser JavaScript ES modules; no frontend framework or build step.
- **Backend/data:** Firebase is the browser-facing BaaS. The app uses Firebase Authentication and Realtime Database through Firebase SDK modules loaded from `gstatic.com`. No custom application server was found.
- **Hosting:** static site in `Webpage/iSideQuest/SideKick/`; `sw.js` provides service-worker caching/update behavior and `manifest.json` configures the installable PWA.
- **Entry point:** `SideKick/index.html` contains the page markup and one large inline `<script type="module">` (roughly lines 2559–18282 at review). It initializes Firebase and owns most mutable app state and feature logic.
- **Styles:** `SideKick/css/styles.css` is the extracted stylesheet.
- **Extracted JS:** `SideKick/js/sound.js` contains sound mode, speech, synthesized/custom audio, orientation locking, wake-lock, and iOS background-audio behavior. `i18n-data.js` and `feature-data.js` hold static data. Collection is split across `collection-store.js` (persistence), `collection-list.js` (list/filter/cards), and `collection-editor.js` (detail/editor/rating/save/delete). Database search, barcode, and photo-cropping remain inline.
- **Other runtime assets:** `Voice/`, `Video/`, `img/`, icons, and QR/barcode libraries.

## Boundaries and dependencies

Current dependency direction:

```text
index.html markup + inline handlers
             |
             v
large inline app module -----> js/sound.js
             +---------------> js/i18n-data.js (data only)
             +---------------> js/feature-data.js (data only)
             +---------------> js/collection-store.js (injected storage API)
             +---------------> js/collection-list.js -----> js/collection-store.js
             +---------------> js/collection-editor.js --> js/collection-list.js / js/collection-store.js
             |
             +---------------> Firebase Auth / Realtime Database SDKs (CDN)
             |
             +---------------> DOM, browser APIs, localStorage

classic inline scripts ------> window-exposed app functions
sw.js -----------------------> static app shell/assets
```

- Local ES-module edges are `index.html` → sound, i18n, feature data, collection store/list/editor; `collection-list.js` → store; `collection-editor.js` → list and store. There are no ES-module cycles.
- `i18n-data.js` exports only `I18N_STRINGS`; it has no DOM, state, Firebase, or app-function dependencies. `lang`, `t()`, `flagFor()`, `applyLang()`, and language-menu handlers intentionally remain in the app module.
- `feature-data.js` exports `FEATURE_DEFS_GRID`, `HIDDEN_FEATURES`, and `FEATURE_INFO`; it is static data only. Feature state, filtering, toggles, settings, and dialogs remain in the app module.
- `collection-store.js` exports `collectionState`, local cache/path/load/save/delete operations. It imports no Firebase SDK; `index.html` injects getters for `db`/`currentUser` and Firebase `get/ref/set/update/remove`.
- `collection-list.js` owns filter/list rendering and shared game-card rendering. It imports collection state from the store and receives escaping, alert, and detail-navigation callbacks from `index.html`; the exported card builder is also used by Friends' read-only collection view.
- `collection-editor.js` owns detail/editor/rating UI and save/delete handlers. Firebase persistence comes through the store; barcode UPC and photo-preview state enter through callbacks. Search, barcode scanning, and photo crop remain in the app module.
- `sound.js` has no imports and now receives app-owned `haptic`, language, and voice-selection collaborators through `configureSoundServices(...)`; the main module configures these after their declarations. Keep the dependency direction one-way.
- Extracted module import URLs and service-worker precache URLs are versioned to avoid stale modules being paired with newer inline app code. Current sound URL is `?v=346`, localization-data URL `?v=347`, feature-data URL `?v=348`, and Collection module URLs are `?v=352`. Keep each import/precache pair in sync when changing a module.
- Sound controls use that explicit haptic callback; the global click-haptic handler excludes those controls/menu options to preserve one haptic pulse per tap.
- `sound.js` combines audio with device lifecycle concerns (orientation, wake lock, background audio). They are separable, but moving them is not necessary until tested as a distinct change.
- HTML `onclick` attributes and post-module classic scripts rely on `window` functions. Module-local declarations are not globals; any extraction must provide explicit imports and deliberate `window` adapters only where HTML/classic-script callers require them.
- Shared mutable state, Firebase calls, DOM rendering, navigation, auth, and feature logic remain interleaved in the inline module. Major clusters include localization; accounts/session; tours; room setup/join; lobby/game state; timers/tools; collection/friends; scoring/rounds.

## Modularization plan (one change at a time)

1. **Baseline and map (done):** record the current entry points, coupling, and smoke checks before further extraction.
2. **Harden the existing sound boundary (adapter in v345; cache-busted import in v346):** verify sound mode, TTS language/voice, haptics, turn/nudge/buzzer audio, wake-lock, and orientation on supported devices. Keep unrelated device behavior separate only if the resulting module is clearer.
3. **Baseline static-data extractions done:** localization data and feature catalog are separate. Next, choose a low-coupling behavior system from measured references; map its state, DOM, Firebase, and `window` dependencies before moving code.
4. **Establish narrow shared contracts:** keep the inline module as composition root while introducing services/state boundaries incrementally. Feature modules must not import the app entry point; avoid cycles and broad global-state rewrites.
5. **Collection extraction in progress:** store, list, and editor/detail/save/delete are separated. Next, map database-search, barcode, and photo dependencies before moving them. Lobby, room, and active-game flows remain last because they share the most mutable state and realtime behavior.
6. **After every extraction:** syntax-check, inspect the diff and dangling references, run focused smoke tests, then update this guide if the module/dependency map changed.

## Test baseline

No package manifest, bundler, automated test runner, or browser-test suite was found in the SideKick app. Use syntax checks plus focused browser/on-device checks:

1. Extract the inline module body from `index.html` to a temporary `.mjs` file and run `node --check` on it; separately check each changed JS module. Syntax checks do not test runtime imports or behavior.
2. Load the app with a fresh service-worker version; check startup and browser console for errors.
3. Verify Firebase initialization, password gate, guest room creation, joining from a second browser/device, lobby updates, game start, and passing a turn.
4. For sound-related changes, test Tone/Name/Mute, turn sound, nudge, countdown buzzer, speech, and haptics where supported.
5. For localization changes, switch languages and verify representative labels/placeholders update and the selection survives reload.
6. For feature-data changes, verify Step 3 feature visibility/toggles and feature-info dialog content.
7. For Collection changes, test guest/local fallback, signed-in load/sync, list/search/filter, detail/edit/rating/save/delete, private-photo attachment, and Friends' read-only game cards as relevant.
8. Test only affected feature flows (for example auth/account, timers, collection/photo, friends, tours); for broad changes also test offline shell load and service-worker update/reload.

The longer human checklist at the source path is `C:\Users\brian\Desktop\SideKick\SMOKE-CHECKLIST.md`. Its version checks mention `APP_VERSION`/`#app-version`, which were not found in the deployed `index.html` during this review; verify the actual version mechanism before relying on those checks.

**v352 Collection editor release:** detail/editor/rating/save/delete are in `collection-editor.js`; persistence is in the store and list/card UI remains in `collection-list.js`. Search/barcode/photo crop remain inline. Syntax and focused store/list tests passed; phone test is pending.

## Low-token AI workflow

- Start from this guide and `HANDOFF.md`; do not reread the full history or entire 18k-line HTML file.
- Search exact symbols/section headings first, then read a small line range around the target and its callers. Ask for or provide only the relevant diff, not full-file output.
- Work on one subsystem and one behavior change per patch. Avoid formatting/reordering untouched code; it increases review context and regression risk.
- Before editing, write a short dependency checklist. After editing, run only targeted checks plus syntax checks; expand smoke tests when a shared boundary changes.
- Keep names, exports, dependencies, and verification results in this guide. Use `HANDOFF.md` for only current paths/version/status, not a duplicate feature history.
- Prefer concise responses: changed files, behavior preserved/changed, checks run and results, and any single next action. Do not emit routine step-by-step narration.
- Avoid adding dependencies/build tooling solely to split files; retain the static deployment model unless a separate decision justifies changing it.
