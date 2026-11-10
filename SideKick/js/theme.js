// SideKick Theme System
// Extracted from index.html inline module.
// Dependencies (globals): currentUser, db, set, ref, t, localStorage, document, window

export const NAMED_THEMES = ['default','8bit','cyberpunk','fantasy','galaxy','forest','ocean','sunset','steampunk','vaporwave','nord','dracula','gothic','halloween','viking','compact'];

export function applyTheme(isLight) {
  document.body.classList.toggle('light-mode', isLight);
  const knob = document.getElementById('theme-knob');
  if (knob) knob.style.transform = isLight ? 'translateX(2.5rem)' : 'translateX(0)';
  updateDirArrows();
}

export function updateDirArrows() {
  const isLight = document.body.classList.contains('light-mode');
  const prefix = isLight ? 'Black' : 'White';
  document.querySelectorAll('.dir-arrow').forEach(img => {
    const name = img.getAttribute('data-arrow');
    if (!name) return;
    const target = 'img/svg/' + prefix + name + '.svg';
    if (img.getAttribute('src') !== target) img.setAttribute('src', target);
  });
}

export function applyFullTheme(themeName, isLight) {
  NAMED_THEMES.forEach(t => document.body.classList.remove('theme-' + t));
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (themeName && themeName !== 'default') {
    document.body.classList.add('theme-' + themeName);
    applyTheme(false);
    if (toggleBtn) toggleBtn.style.display = 'none';
  } else {
    applyTheme(isLight);
    if (toggleBtn) toggleBtn.style.display = '';
  }
}

export function toggleTheme() {
  const isLight = !document.body.classList.contains('light-mode');
  const ts = String(Date.now());
  try { localStorage.setItem('sk_theme', isLight ? 'light' : 'dark'); } catch {}
  try { localStorage.setItem('sk_theme_ts', ts); } catch {}
  const namedTheme = localStorage.getItem('sk_named_theme') || 'default';
  if (namedTheme === 'default') applyFullTheme('default', isLight);
  // Sync to Firebase
  const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
  const dbRef = (typeof db !== 'undefined') ? db : null;
  if (uid && dbRef && typeof set === 'function' && typeof ref === 'function') {
    set(ref(dbRef, `users/${uid}/theme`), isLight ? 'light' : 'dark').catch(() => {});
    set(ref(dbRef, `users/${uid}/namedTheme`), namedTheme).catch(() => {});
    set(ref(dbRef, `users/${uid}/themeTs`), Date.now()).catch(() => {});
  }
}

export function openThemesOverlay() {
  const current = localStorage.getItem('sk_named_theme') || 'default';
  document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('selected'));
  const activeOpt = document.getElementById('theme-opt-' + current);
  if (activeOpt) {
    activeOpt.classList.add('selected');
    const radio = activeOpt.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  }
  const overlay = document.getElementById('themes-overlay');
  if (overlay) overlay.classList.add('show');
}

export function closeThemesOverlay() {
  const overlay = document.getElementById('themes-overlay');
  if (overlay) overlay.classList.remove('show');
}

export function selectTheme(themeName) {
  try { localStorage.setItem('sk_named_theme', themeName); } catch {}
  try { localStorage.setItem('sk_theme_ts', String(Date.now())); } catch {}
  const isLight = document.body.classList.contains('light-mode');
  applyFullTheme(themeName, isLight);
  document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('selected'));
  const activeOpt = document.getElementById('theme-opt-' + themeName);
  if (activeOpt) {
    activeOpt.classList.add('selected');
    const radio = activeOpt.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  }
  // Sync to Firebase — named themes always force dark, so save that too
  const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : null;
  const dbRef = (typeof db !== 'undefined') ? db : null;
  if (uid && dbRef && typeof set === 'function' && typeof ref === 'function') {
    set(ref(dbRef, `users/${uid}/namedTheme`), themeName).catch(() => {});
    if (themeName !== 'default') {
      try { localStorage.setItem('sk_theme', 'dark'); } catch {}
      set(ref(dbRef, `users/${uid}/theme`), 'dark').catch(() => {});
    }
    set(ref(dbRef, `users/${uid}/themeTs`), Date.now()).catch(() => {});
  }
}

export function resetThemeToDefault() {
  try { localStorage.setItem('sk_named_theme', 'default'); } catch {}
  applyFullTheme('default', document.body.classList.contains('light-mode'));
}

// Apply saved theme on load
(function() {
  const saved = localStorage.getItem('sk_theme');
  const namedTheme = localStorage.getItem('sk_named_theme') || 'default';
  applyFullTheme(namedTheme, saved === 'light');
})();

export function openMyAwards() {
  const list = document.getElementById('awards-history-list');
  if (!list) return;
  list.innerHTML = '';
  const uid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.uid : '';
  const awards = uid ? JSON.parse(localStorage.getItem('sk_awards_' + uid) || '[]') : [];
  if (awards.length === 0) {
    list.innerHTML = '<div class="awards-history-empty">No awards yet — play a game with Achievement Awards enabled to earn some!</div>';
  } else {
    awards.slice().reverse().forEach(a => {
      const dateStr = a.date ? new Date(a.date).toLocaleDateString() : '';
      list.innerHTML += '<div class="awards-history-item">' +
        '<div class="awards-history-trophy">' + (a.trophy || '🏆') + '</div>' +
        '<div class="awards-history-info">' +
          '<div class="awards-history-category">' + esc(a.category || 'Award') + '</div>' +
          '<div class="awards-history-stat">' + esc(a.stat || '') + '</div>' +
        '</div>' +
        '<div class="awards-history-date">' + dateStr + '</div>' +
      '</div>';
    });
  }
  const overlay = document.getElementById('my-awards-overlay');
  if (overlay) overlay.classList.add('show');
}

export function closeMyAwards() {
  const overlay = document.getElementById('my-awards-overlay');
  if (overlay) overlay.classList.remove('show');
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
