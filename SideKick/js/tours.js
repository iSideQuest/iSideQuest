// SideKick Tours Module
// Extracted from index.html inline module.
// Dependencies are accessed via window.* (late-bound globals from main module).


// ── GUIDED TOUR (home → create → lobby → play → exit, gated + auto-advance) ──
// Drives the REAL wizard/room UI; gates read live state (screens, createStep,
// room snapshot). Only rooms created mid-tour are ever deleted on cleanup.
let tutorialStep = 0;
let tutorialUnsub = null;
let tutorialScreenObs = null;
let tutorialCreateObs = null;
let _tutorialRoom = null;
let _tutorialStartActive = null;
let _tutorialStartCode = null;
let _origSelectFirst = null;
const TUTORIAL_STEPS = 10;
let tourMode = null; // 'guided' | 'indepth' | 'manual' | null
let manualSteps = null;
let manualTitle = '';
// Click guard: during gated steps, only task-relevant controls respond.
// Everything else is swallowed so users can't veer off the guide.
// (Scrolling is untouched — only taps/clicks are filtered.)
const TOUR_ALLOW = {
  1: ['#screen-home [onclick="showCreateRoom()"]'],
  2: ['.create-step[data-step="1"] *', '#color-picker-overlay *', '#avatar-overlay *', '#room-avatar-overlay *', '.custom-kb *'],
  3: ['.create-step[data-step="2"] *', '.custom-kb *'],
  4: ['.create-step[data-step="3"] *', '.feature-settings-overlay *', '#features-help-overlay *', '.custom-kb *'],
  5: ['#screen-lobby [data-act="create"]', '#standin-player-overlay *', '#color-picker-overlay *', '#avatar-overlay *', '#room-avatar-overlay *', '.custom-kb *'],
  6: ['#screen-lobby [id^="first-opt-"]'],
  7: ['#screen-lobby #start-btn'],
  8: ['#btn-left', '#btn-right', '#pass-tap-btn'],
  9: ['.screen.active .exit-btn', '#app-dialog-overlay *'],
  10: []
};
function tourGuard(e) {
  if (tourMode !== 'guided' && tourMode !== 'indepth' && tourMode !== 'manual') return;
  if (tourMode === 'guided' && (!tutorialStep || tutorialStep >= TUTORIAL_STEPS)) return;
  const t = e.target && e.target.closest ? e.target.closest('#tutorial-coach *, button, a, input, textarea, select, [onclick], [role="button"]') : null;
  if (!t) return;
  if (t.closest('#tutorial-coach')) return;
  // Alert/confirm/prompt dialogs must always be dismissible — never trap the user
  if (t.closest('#app-dialog-overlay')) return;
  const allowed = tourMode === 'guided' ? (TOUR_ALLOW[tutorialStep] || []) : [];
  for (const sel of allowed) {
    try { if (t.matches(sel)) return; } catch {}
  }
  e.stopPropagation();
  e.preventDefault();
  try {
    const ring = document.getElementById('tour-ring');
    if (ring) {
      ring.style.boxShadow = '0 0 1.5rem rgba(255,90,90,0.9),inset 0 0 0.75rem rgba(255,90,90,0.3)';
      if (window._tourPulseT) clearTimeout(window._tourPulseT);
      window._tourPulseT = setTimeout(() => { ring.style.boxShadow = ''; }, 350);
    }
  } catch {}
  window.haptic(3);
}
document.addEventListener('click', tourGuard, true);
function tourFocusEl(step) {
  try {
    switch (step) {
      case 1: return document.querySelector('#screen-home [onclick="showCreateRoom()"]');
      case 2: return document.querySelector('.create-step[data-step="1"] .card');
      case 3: return document.querySelector('.create-step[data-step="2"] .card');
      case 4: return document.querySelector('.create-step[data-step="3"] .card');
      case 5: return document.querySelector('#screen-lobby #lobby-wheel-center');
      case 6: return document.querySelector('#screen-lobby #first-opt-random');
      case 7: return document.querySelector('#screen-lobby #start-btn');
      case 8: {
        const cands = document.querySelectorAll('.screen.active #btn-left, .screen.active #btn-right, .screen.active #pass-tap-btn');
        for (const c of cands) {
          try { const r = c.getBoundingClientRect(); if (r.width && r.height) return c; } catch {}
        }
        try {
          const w = document.querySelector('.screen.active #wheel-dir-active');
          if (w) { const r = w.getBoundingClientRect(); if (r.width && r.height) return w; }
        } catch {}
        return cands[0] || null;
      }
      case 9: return document.querySelector('.screen.active .exit-btn');
      default: return null;
    }
  } catch { return null; }
}
function tourSetDim(id, l, t, w, h) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = (w > 0 && h > 0) ? 'block' : 'none';
  el.style.left = l + 'px';
  el.style.top = t + 'px';
  el.style.width = w + 'px';
  el.style.height = h + 'px';
}
function tourHideSpotlight() {
  ['tour-dim-t', 'tour-dim-b', 'tour-dim-l', 'tour-dim-r', 'tour-ring'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}
function tourSpotlight() {
  const ring = document.getElementById('tour-ring');
  if (!ring) return;
  let el = null, pad = 6;
  if (tourMode === 'indepth' || tourMode === 'manual') {
    try {
      const steps = manualSteps || INDEPTH_STEPS;
      const s = steps[Math.min(Math.max(indepthStep, 1), steps.length) - 1];
      if (s && s.sel) el = document.querySelector(s.sel);
    } catch {}
  } else {
    if (!tutorialStep || tutorialStep >= TUTORIAL_STEPS) { tourHideSpotlight(); return; }
    try { el = tourFocusEl(tutorialStep); } catch {}
    pad = (tutorialStep >= 2 && tutorialStep <= 4) ? 14 : 6;
  }
  if (!tourMode) { tourHideSpotlight(); return; }
  const vw = window.innerWidth, vh = window.innerHeight;
  const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
  if (!r || !r.width || !r.height) {
    // No visible focus — dim everything
    ['tour-dim-t', 'tour-dim-b', 'tour-dim-l', 'tour-dim-r'].forEach(id => { const d = document.getElementById(id); if (d) d.style.zIndex = 9490; });
    ring.style.zIndex = 9491;
    const _coach0 = document.getElementById('tutorial-coach'); if (_coach0) _coach0.style.zIndex = 9500;
    tourSetDim('tour-dim-t', 0, 0, vw, vh);
    tourSetDim('tour-dim-b', 0, 0, 0, 0);
    tourSetDim('tour-dim-l', 0, 0, 0, 0);
    tourSetDim('tour-dim-r', 0, 0, 0, 0);
    ring.style.display = 'none';
    return;
  }
  const x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad);
  // Lift the spotlight above full-screen pickers (color/avatar) so the ring stays visible
  const liftTop = !!(el && el.closest && el.closest('#color-picker-overlay.show, #room-avatar-overlay.show'));
  ['tour-dim-t', 'tour-dim-b', 'tour-dim-l', 'tour-dim-r'].forEach(id => { const d = document.getElementById(id); if (d) d.style.zIndex = liftTop ? 9849 : 9490; });
  ring.style.zIndex = liftTop ? 9850 : 9491;
  const _coach1 = document.getElementById('tutorial-coach'); if (_coach1) _coach1.style.zIndex = liftTop ? 9860 : 9500;
  const w = Math.min(vw - x, r.width + pad * 2), h = Math.min(vh - y, r.height + pad * 2);
  tourSetDim('tour-dim-t', 0, 0, vw, y);
  tourSetDim('tour-dim-b', 0, y + h, vw, vh - y - h);
  tourSetDim('tour-dim-l', 0, y, x, h);
  tourSetDim('tour-dim-r', x + w, y, vw - x - w, h);
  ring.style.left = x + 'px';
  ring.style.top = y + 'px';
  ring.style.width = w + 'px';
  ring.style.height = h + 'px';
  ring.style.display = 'block';
}
function tourReposition() { if (tutorialStep) { try { tourSpotlight(); } catch {} } }
window.addEventListener('scroll', tourReposition, { capture: true, passive: true });
window.addEventListener('resize', tourReposition);
window.addEventListener('orientationchange', tourReposition);
function tutorialActiveScreen() {
  try {
    const el = document.querySelector('.screen.active');
    return el ? el.id : null;
  } catch { return null; }
}
function tutorialPlayerCount() {
  try { return Object.keys((_tutorialRoom && _tutorialRoom.players) || {}).length; }
  catch { return 0; }
}
function tutorialGate(step) {
  if (step >= TUTORIAL_STEPS) return true;
  if (step === 1) return tutorialActiveScreen() === 'screen-create';
  if (step === 2) return (typeof createStep !== 'undefined' && createStep >= 2);
  if (step === 3) return (typeof createStep !== 'undefined' && createStep >= 3);
  if (step === 4) return tutorialActiveScreen() === 'screen-lobby';
  if (step === 5) return tutorialPlayerCount() >= 2;
  if (step === 6) return (typeof firstPlayerOption !== 'undefined' && firstPlayerOption !== null);
  if (step === 7) {
    const s = tutorialActiveScreen();
    return s === 'screen-active' || s === 'screen-waiting';
  }
  if (step === 8) {
    const a = practiceActiveId(_tutorialRoom);
    return !!a && !!_tutorialStartActive && a !== _tutorialStartActive;
  }
  if (step === 9) return tutorialActiveScreen() === 'screen-home';
  return true;
}
function tutorialWatchRoom() {
  if (tutorialUnsub || !roomCode || !db) return;
  try {
    tutorialUnsub = onValue(ref(db, `rooms/${roomCode}`), (snap) => {
      if (!snap.exists()) return;
      _tutorialRoom = snap.val();
      updateTutorial();
    });
  } catch {}
}
function updateTutorial() {
  if (!tutorialStep) return;
  tutorialWatchRoom();
  if (!tutorialGate(tutorialStep)) return;
  if (tutorialStep >= TUTORIAL_STEPS) return;
  tutorialStep++;
  if (tutorialStep === 8) _tutorialStartActive = practiceActiveId(_tutorialRoom);
  renderTutorialStep();
  window.haptic(10);
}
function renderTutorialStep() {
  const texts = [
    'Here is how we start your first SideKick room! Begin by choosing "Host New Room".',
    'Enter your name, pick a color and avatar, then choose <b>Confirm</b>.',
    'Choose which way turns pass in your game, then choose <b>Confirm</b>.',
    'Toggle any features you like (or none), then choose <b>Create Room</b>.',
    'This is the <b>player lobby</b>. Normally, your friends will join you here, but we can actually create players manually, choose <b>Create Player</b>.',
    'This is where you choose who goes first. For now choose <b>Random</b>.',
    'Choose <b>Start Game</b> to begin.',
    'This shows you who the current player&#39s turn is. Tap the screen to pass the turn to the next player.',
    'When you are done playing? Choose <b>Exit Room</b> to close the game room.',
    'That was my Quick Start Tour of SideKick. Want more? My In-Depth Tour teaches you EVERYTHING about SideKick. Or, explore on your own and enjoy!'
  ];
  const idx = Math.min(Math.max(tutorialStep, 1), TUTORIAL_STEPS) - 1;
  window._coachStep = null;
  renderCollapseDefault('g:' + idx);
  setMiniText(texts[idx]);
  document.getElementById('tutorial-text').innerHTML = texts[idx];
  const dotsEl = document.getElementById('tutorial-dots');
  if (dotsEl) {
    dotsEl.innerHTML = '';
    for (let i = 1; i <= TUTORIAL_STEPS; i++) {
      const d = document.createElement('span');
      const on = i === idx + 1, done = i < idx + 1;
      d.style.cssText = 'width:' + (on ? '1.1rem' : '0.4rem') + ';height:0.4rem;border-radius:999rem;background:' + (on ? 'var(--accent)' : (done ? 'var(--accent-light)' : 'rgba(255,255,255,0.2)')) + ';';
      dotsEl.appendChild(d);
    }
  }
  document.getElementById('tutorial-finish-row').style.display = idx === TUTORIAL_STEPS - 1 ? '' : 'none';
  // Tour step 2 focuses the high wizard Step 1 card — lift the coach so it never covers it
  try {
    const coachEl = document.getElementById('tutorial-coach');
    if (coachEl) coachEl.style.top = (idx === 1) ? '0.75rem' : 'calc(4.75rem + env(safe-area-inset-top, 0))';
  } catch {}
  tourSpeak();
  tourSpotlight();
  try { requestAnimationFrame(() => tourSpotlight()); } catch {}
}
window.renderTutorialStep = renderTutorialStep;
window.startTutorial = function() {
  try { if (typeof practiceStep !== 'undefined' && practiceStep > 0) endPractice(); } catch {}
  tourMode = 'guided';
  updateTourVoiceBtn();
  document.getElementById('tour-title').textContent = 'Quick Start Tour';
  const navRow = document.getElementById('tutorial-nav-row');
  if (navRow) navRow.style.display = 'none';
  tutorialStep = 1;
  _tutorialRoom = null;
  _tutorialStartActive = null;
  _tutorialStartCode = (typeof roomCode !== 'undefined') ? roomCode : null;
  if (!_origSelectFirst && window.selectFirstPlayerOption) {
    _origSelectFirst = window.selectFirstPlayerOption;
    window.selectFirstPlayerOption = function(...args) {
      const r = _origSelectFirst.apply(this, args);
      updateTutorial();
      return r;
    };
  }
  try {
    if (tutorialScreenObs) tutorialScreenObs.disconnect();
    tutorialScreenObs = new MutationObserver(() => updateTutorial());
    document.querySelectorAll('.screen').forEach(s => tutorialScreenObs.observe(s, { attributes: true, attributeFilter: ['class'] }));
  } catch {}
  try {
    if (tutorialCreateObs) tutorialCreateObs.disconnect();
    const area = document.getElementById('create-cards-area');
    if (area) {
      tutorialCreateObs = new MutationObserver(() => updateTutorial());
      tutorialCreateObs.observe(area, { attributes: true, subtree: true, attributeFilter: ['class'] });
    }
  } catch {}
  renderTutorialStep();
  document.getElementById('tutorial-coach').style.display = 'block';
  window.haptic(15);
  updateTutorial();
};
async function tutorialCleanup() {
  const code = (typeof roomCode !== 'undefined') ? roomCode : null;
  const mine = code && code !== _tutorialStartCode;
  if (tutorialUnsub) { try { tutorialUnsub(); } catch {} tutorialUnsub = null; }
  _tutorialRoom = null;
  try { if (tutorialScreenObs) tutorialScreenObs.disconnect(); } catch {}
  try { if (tutorialCreateObs) tutorialCreateObs.disconnect(); } catch {}
  tutorialScreenObs = tutorialCreateObs = null;
  if (_origSelectFirst) { window.selectFirstPlayerOption = _origSelectFirst; _origSelectFirst = null; }
  const coach = document.getElementById('tutorial-coach');
  if (coach) { coach.style.display = 'none'; coach.style.top = 'calc(4.75rem + env(safe-area-inset-top, 0))'; }
  tourStopVoice();
  try { tourHideSpotlight(); } catch {}
  if (mine) {
    try { cleanupListeners(); } catch {}
    roomCode = null; myId = null; isHost = false;
    try { clearSession(); } catch {}
    if (db && code) { try { await remove(ref(db, `rooms/${code}`)); } catch {} }
  }
  tutorialStep = 0;
  tourMode = null;
  return mine;
}
// ── TOUR VOICE (device text-to-speech, free/offline, matches app language) ──
let tourVoiceOn = true;
try { tourVoiceOn = localStorage.getItem('sk_tour_voice') !== 'off'; } catch {}
export function tourPickVoice() {
  try {
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    if (!vs.length) return null;
    const langCode = ((typeof lang !== 'undefined' && lang) || 'en').toLowerCase();
    const pool = vs.filter(v => ((v && v.lang) || '').toLowerCase().indexOf(langCode) === 0);
    const list = pool.length ? pool : vs;
    return list.find(v => /google|microsoft|samantha|zira|aria|jenny|natural/i.test(v.name || ''))
        || list.find(v => /female/i.test(v.name || ''))
        || list[0];
  } catch { return null; }
}
// configureSoundServices is called from index.html after this module loads
function tourStopVoice() {
  try { speechSynthesis.cancel(); } catch {}
  try { const au = document.getElementById('tour-audio'); if (au) au.pause(); } catch {}
}
function tourAudioSrc() {
  if (tourMode === 'guided') return 'audio/tour-quick-' + Math.min(Math.max(tutorialStep, 1), 10) + '.mp3';
  if (tourMode === 'indepth') { const map = {1:'InDepthTour1',2:'InDepthTour2',3:'InDepthTour3',4:'InDepthTour4',5:'HostPresetRoom',6:'InDepthTour5',7:'InDepthTour6',8:'InDepthTour7',9:'InDepthTour8',10:'InDepthTour9'}; const st = Math.min(Math.max(indepthStep, 1), 10); return 'Voice/' + (map[st] || 'InDepthTour9') + '.wav'; }
  if (tourMode === 'manual' && manualSteps === JOINING_STEPS) { const st = Math.min(Math.max(indepthStep, 1), 12); return 'Voice/JoinRoom' + st + '.wav'; }
  if (tourMode === 'manual' && manualSteps === QUICK_STEPS) { const st = Math.min(Math.max(indepthStep, 1), 8); return 'Voice/QuickTour' + st + '.wav'; }
  return null;
}
function tourSpeak() {
  // Pre-recorded line if shipped, otherwise device TTS
  try {
    if (!tourVoiceOn) return;
    const src = tourAudioSrc();
    const au = document.getElementById('tour-audio');
    if (src && au) {
      try { au.pause(); } catch {}
      au.onerror = () => tourSpeakTTS();
      au.src = src;
      const p = au.play();
      if (p && p.catch) p.catch(() => tourSpeakTTS());
      return;
    }
    tourSpeakTTS();
  } catch { tourSpeakTTS(); }
}
function tourSpeakTTS() {
  try {
    if (!tourVoiceOn || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const el = document.getElementById('tutorial-text');
    const text = el ? (el.textContent || '').trim() : '';
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    const v = tourPickVoice();
    if (v) u.voice = v;
    try { u.lang = (typeof lang !== 'undefined' && lang) || 'en'; } catch {}
    u.pitch = 1.15;
    u.rate = 1;
    speechSynthesis.speak(u);
  } catch {}
}
function updateTourVoiceBtn() {
  const b = document.getElementById('tour-voice-btn');
  if (b) b.textContent = tourVoiceOn ? '🔊' : '🔇';
}
window.toggleTourVoice = function() {
  tourVoiceOn = !tourVoiceOn;
    try { localStorage.setItem('sk_tour_voice', tourVoiceOn ? 'on' : 'off'); } catch {}
  tourStopVoice();
  updateTourVoiceBtn();
  if (tourVoiceOn) tourSpeak();
  window.haptic(5);
};
// ── COACH MINI-BAR (collapsed tour card, tap to expand) ──
function setMiniText(html) {
  const el = document.getElementById('coach-mini-text');
  if (!el) return;
  try {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    let t = (div.textContent || div.innerText || '').trim();
    el.textContent = t;
  } catch {}
}
function renderCollapseDefault(key) {
  const coach = document.getElementById('tutorial-coach');
  if (key !== window._coachKey || (coach && coach.style.display === 'none')) {
    window._coachKey = key;
    setCoachExpanded(false);
  }
}
window.setCoachExpanded = function(b) {
  const full = document.getElementById('coach-full'), mini = document.getElementById('coach-mini');
  if (full) full.style.display = b ? '' : 'none';
  if (mini) mini.style.display = b ? 'none' : 'flex';
  const nav = document.getElementById('coach-mini-nav');
  if (nav) nav.style.display = (tourMode === 'guided') ? 'none' : '';
  const s = window._coachStep;
  if (s && tourMode !== 'guided') { try { positionCoachForStep(s); } catch {} }
};
window.toggleCoachExpand = function(e) {
  if (e && e.target && e.target.closest && e.target.closest('button')) return;
  setCoachExpanded(true);
};
window.toggleCoachCollapse = function(e) {
  if (e && e.target && e.target.closest && e.target.closest('button')) return;
  setCoachExpanded(false);
};
window.coachMiniNav = function(e, d) {
  try { if (e) { e.stopPropagation(); if (e.preventDefault) e.preventDefault(); } } catch {}
  if (tourMode === 'manual' || tourMode === 'indepth') {
    if (d < 0) indepthBack(); else indepthNext();
  }
  window.haptic(5);
};
function positionCoachForStep(s) {
  const coach = document.getElementById('tutorial-coach');
  if (!coach) return;
  const ch = coach.offsetHeight || 320, gap = 12, minTop = 64;
  if (s.dock === 'bottom') {
    const wiz = document.getElementById('join-wizard-btns');
    const wr = wiz && wiz.getBoundingClientRect ? wiz.getBoundingClientRect() : null;
    const top = (wr && wr.width > 0 && wr.height > 0) ? (wr.top - ch - gap) : (window.innerHeight - ch - 110);
    coach.style.top = Math.max(minTop, top) + 'px';
  } else {
    const tgt = s.sel ? document.querySelector(s.sel) : null;
    const tr = tgt && tgt.getBoundingClientRect ? tgt.getBoundingClientRect() : null;
    if (tr && tr.width > 0 && tr.height > 0) {
      let top = tr.top - ch - gap;
      if (top < minTop) top = tr.bottom + gap;
      top = Math.max(minTop, Math.min(top, window.innerHeight - ch - 96));
      coach.style.top = top + 'px';
    }
  }
}
window.quitTour = function() {
  if (tourMode === 'indepth') endInDepthTour();
  else if (tourMode === 'manual') endManualTour();
  else endTutorial();
};
// ── MANUAL MINI-TOURS (hosting / joining / profile walkthroughs) ──
const HOSTING_STEPS = [
  { sel: null, title: 'Hosting a Room', text: 'Hosting walks the Create screen top to bottom. Tap Next.' },
  { sel: '.create-step[data-step="1"] .card', title: 'Step 1: You', text: 'Enter your name, pick a color and avatar, then Continue.' },
  { sel: '.create-step[data-step="2"] .card', title: 'Step 2: Direction', text: 'Choose which way turns pass around the table.' },
  { sel: '.create-step[data-step="3"] .card', title: 'Step 3: Features', text: 'Toggle extras like Victory Points, then tap Create Room.' },
  { sel: '#create-final-btn', title: 'Create Room', text: 'This button opens your player lobby.' }
];
// ── JOIN TOUR helpers: drive the real Join UI with a mock player, restore on exit ──
function tourJoinClosePickers() {
  try { document.getElementById('color-picker-overlay').classList.remove('show'); } catch {}
  try { document.getElementById('room-avatar-overlay').classList.remove('show'); } catch {}
}
function tourJoinHome() {
  tourJoinClosePickers();
  try { showScreen('home'); } catch {}
}
function tourJoinSetup() {
  tourJoinClosePickers();
  try {
    if (!window._tourJoinSaved) {
      window._tourJoinSaved = {
        name: document.getElementById('join-name').value,
        code: document.getElementById('join-code').value,
        color: (typeof myColor !== 'undefined' ? myColor : ''),
        avatar: (typeof roomAvatarSelection !== 'undefined' ? roomAvatarSelection : ''),
        step: (typeof joinStep !== 'undefined' ? joinStep : 1)
      };
    }
    document.getElementById('join-name').value = 'Dante';
    document.getElementById('join-code').value = '';
    myColor = ''; roomAvatarSelection = '';
    const jcb = document.getElementById('join-color-btn'), jcl = document.getElementById('join-color-label');
    if (jcb) { jcb.style.background = ''; jcb.style.borderColor = ''; jcb.classList.remove('light-fill'); }
    if (jcl) { jcl.innerHTML = 'Choose<br>Color'; jcl.style.color = ''; }
    window.setAvatarLabel(document.getElementById('join-avatar-label'), '');
    joinStep = 1; renderJoinStep(); updateJoinCollapseSummary();
    showScreen('join');
  } catch {}
}
function tourJoinToStep1() {
  tourJoinClosePickers();
  try { joinStep = 1; renderJoinStep(); updateJoinCollapseSummary(); showScreen('join'); } catch {}
}
function tourJoinToStep2() {
  tourJoinClosePickers();
  try { joinStep = 2; renderJoinStep(); updateJoinCollapseSummary(); showScreen('join'); } catch {}
}
function tourJoinOpenColors() {
  try { openColorPicker('join'); } catch {}
}
function tourJoinOpenAvatars() {
  try { openRoomAvatarOverlay(); } catch {}
  try {
    const tabs = Array.prototype.slice.call(document.querySelectorAll('#room-avatar-tabs .avatar-tab'));
    const sp = tabs.find(b => (b.textContent || '').trim() === 'Special');
    if (sp) sp.click();
  } catch {}
}
function tourJoinMockLobby() {
  tourJoinClosePickers();
  try {
    showScreen('waiting-lobby');
    const code = document.getElementById('wl-code');
    if (code) code.textContent = '1234';
    renderWaitingLobbyList([
      { id: 'tour-dante', name: 'Dante', color: '#005ee7', avatar: 'img/Dante2.png' },
      { id: 'tour-you', name: 'You', color: '#e74c3c', avatar: '\uD83D\uDE00' }
    ]);
  } catch {}
}
function tourJoinRestore() {
  const s = window._tourJoinSaved;
  window._tourJoinSaved = null;
  tourJoinClosePickers();
  if (!s) return;
  try {
    document.getElementById('join-name').value = s.name || '';
    document.getElementById('join-code').value = s.code || '';
    myColor = s.color || ''; roomAvatarSelection = s.avatar || '';
    const jcb = document.getElementById('join-color-btn'), jcl = document.getElementById('join-color-label');
    if (jcb) { jcb.style.background = myColor; jcb.style.borderColor = myColor; jcb.classList.toggle('light-fill', !!(myColor && window.isLightColor(myColor))); }
    if (jcl) {
      if (myColor) { jcl.textContent = (window.PLAYER_COLORS.find(c => c.hex === myColor) || {}).name || 'Custom'; jcl.style.color = window.isLightColor(myColor) ? '#000' : '#fff'; }
      else { jcl.innerHTML = 'Choose<br>Color'; jcl.style.color = ''; }
    }
    window.setAvatarLabel(document.getElementById('join-avatar-label'), s.avatar || '');
    joinStep = s.step || 1; renderJoinStep(); updateJoinCollapseSummary();
  } catch {}
}
const JOINING_STEPS = [
  { sel: '#screen-home [onclick="showJoinRoom()"]', text: 'Here is an example of joining a room. To join a room that your friend is already hosting, select Join Room from the Home Page.', enter: tourJoinHome },
  { sel: '#join-name', dock: 'bottom', text: 'Beginning with Step 1, start by typing in your preferred Player Name.', enter: tourJoinSetup },
  { sel: '#join-color-btn', dock: 'bottom', text: 'Next, select Choose Color to pick your player color.', enter: tourJoinClosePickers },
  { sel: '#color-grid .color-swatch[title="Blue"]', text: 'Choose one of the colors that will represent you to all players and then Confirm your choice.', enter: tourJoinOpenColors },
  { sel: '#join-avatar-btn', dock: 'bottom', text: 'Next, select Choose Avatar.', enter: tourJoinClosePickers },
  { sel: '#room-avatar-grid .avatar-option[data-avatar="img/Dante2.png"]', text: 'Look who it is, It\'s my avatar! After selecting it I Confirm my choice.', enter: tourJoinOpenAvatars },
  { sel: '#join-next-btn', dock: 'bottom', text: 'Once player name, color, and avatar are chosen, select Confirm to move to Step 2.', enter: tourJoinToStep1 },
  { sel: '.join-step[data-step="2"] [onclick="openQRScanner()"]', dock: 'bottom', text: 'In Step 2, we need to add your friend\'s room code. You can scan the host\'s QR code using this option.', enter: tourJoinToStep2 },
  { sel: '#join-code', dock: 'bottom', text: 'Or you can type the 4-digit room code here.', enter: tourJoinClosePickers },
  { sel: '#join-final-btn', dock: 'bottom', text: 'Select Join Room and you will enter the Player Lobby.', enter: tourJoinToStep2 },
  { sel: '#wl-wheel-wrap', dock: 'bottom', text: 'This is the Player Lobby that guests see. Both you and I are here.', enter: tourJoinMockLobby },
  { sel: null, dock: 'bottom', text: 'When all players are ready, the host chooses Start Game and SideKick begins.' }
];
const PROFILE_STEPS = [
  { sel: null, title: 'Dante’s Profile', text: 'This is MY demo profile — no login needed. Tap Next.' },
  { sel: '#demo-profile-avatar', title: 'Avatar & Name', text: 'My picture and name. Yours works the same way — tap to edit.' },
  { sel: '#demo-profile-title', title: 'Title', text: 'I’m showing off Duel King. You can pick your own title too.' },
  { sel: '#demo-row-themes', title: 'Themes', text: 'Recolor and restyle the whole app from here.' },
  { sel: '#demo-row-collection', title: 'My Collection', text: 'A peek at my board game shelf — yours holds photos, ratings and filters.' },
  { sel: '#demo-row-friends', title: 'Friends', text: 'Add friends by code and visit their profiles.' },
  { sel: '#demo-profile-close', title: 'That’s Me!', text: 'Sign in anytime to build your own profile just like this one.' }
];
// ── QUICK SHOWCASE TOUR (What Is SideKick: ~45s auto-advancing reel, view-only) ──
function quickHome() { try { tourJoinClosePickers(); showScreen('home'); } catch {} }
function quickCreate(n) { try { tourJoinClosePickers(); showCreateRoom(); createStep = n; renderCreateStep(); } catch {} }
function quickJoinCode() { try { tourJoinClosePickers(); showJoinRoom(); joinStep = 2; renderJoinStep(); updateJoinCollapseSummary(); } catch {} }
function quickLobby() {
  try {
    tourJoinClosePickers();
    showScreen('waiting-lobby');
    const code = document.getElementById('wl-code');
    if (code) code.textContent = '1234';
    renderWaitingLobbyList([
      { id: 'tour-dante', name: 'Dante', color: '#005ee7', avatar: 'img/Dante2.png' },
      { id: 'tour-you', name: 'You', color: '#e74c3c', avatar: '\uD83D\uDE00' }
    ]);
  } catch {}
}
function quickArm() {
  try {
    if (window._quickTimer) clearTimeout(window._quickTimer);
    window._quickTimer = null;
    if (tourMode === 'manual' && manualSteps === QUICK_STEPS) {
      window._quickTimer = setTimeout(() => { if (tourMode === 'manual' && manualSteps === QUICK_STEPS) indepthNext(); }, 5500);
    }
  } catch {}
}
function quickClear() { try { if (window._quickTimer) { clearTimeout(window._quickTimer); window._quickTimer = null; } } catch {} }
const QUICK_STEPS = [
  { sel: '#screen-home [onclick="showCreateRoom()"]', text: 'SideKick runs your game night. Hosting a room takes seconds - tap Host New Room and follow three quick steps.', enter: quickHome },
  { sel: '#screen-home [onclick="showJoinRoom()"]', text: 'Friends join from their own phones with a 4-digit code. No accounts, nothing to install.', enter: quickHome },
  { sel: '.create-step[data-step="1"] .card', text: 'Step 1: players grab a name, a color and an avatar.', enter: function() { quickCreate(1); } },
  { sel: '.create-step[data-step="2"] .card', text: 'Step 2: choose which way turns pass around the table.', enter: function() { quickCreate(2); } },
  { sel: '.create-step[data-step="3"] .card', text: 'Step 3: add scoring, timers and extras - or keep it classic.', enter: function() { quickCreate(3); } },
  { sel: '#join-code', dock: 'bottom', text: 'Joining takes one 4-digit code. Type it or scan the host QR.', enter: quickJoinCode },
  { sel: '#wl-wheel-wrap', dock: 'bottom', text: 'The live table shows everyone. The banner always tells you whose turn it is.', enter: quickLobby },
  { sel: null, dock: 'bottom', text: 'When the host taps Start, SideKick runs the night. Try the Quick Start Tour next!' }
];
window.openQuickTour = function() {
  closeSidekickInfo();
  window._quickRan = true;
  try { showScreen('home'); } catch {}
  startManualTour('quick', 'What Is SideKick');
};
window.startManualTour = function(kind, title) {
  const map = { hosting: HOSTING_STEPS, joining: JOINING_STEPS, profile: PROFILE_STEPS, quick: QUICK_STEPS };
  manualSteps = map[kind] || null;
  if (!manualSteps) return;
  manualTitle = title || 'Tour';
  tourMode = 'manual';
  indepthStep = 1;
  updateTourVoiceBtn();
  renderInDepthStep();
  document.getElementById('tutorial-coach').style.display = 'block';
  document.getElementById('tour-title').textContent = manualTitle;
  window.haptic(15);
};
window.endManualTour = function() {
  tourMode = null;
  indepthStep = 0;
  manualSteps = null;
  tourStopVoice();
  document.getElementById('tutorial-coach').style.display = 'none';
  try { document.getElementById('demo-profile-overlay').classList.remove('show'); } catch {}
  try { tourHideSpotlight(); } catch {}
  try { tourJoinRestore(); } catch {}
  try { quickClear(); } catch {}
  if (window._quickRan) { window._quickRan = false; try { const wl = document.getElementById('wl-code'); if (wl) wl.textContent = '----'; } catch {} }
  showScreen('home');
  openSidekickInfo({ quiet: true });
};
window.openHostingTour = function() {
  closeSidekickInfo();
  try { showCreateRoom(); } catch {}
  startManualTour('hosting', 'Hosting Tour');
};
window.openJoiningTour = function() {
  closeSidekickInfo();
  try { showScreen('home'); } catch {}
  startManualTour('joining', 'Join Room Tour');
};
window.openProfileTour = function() {
  closeSidekickInfo();
  document.getElementById('demo-profile-overlay').classList.add('show');
  startManualTour('profile', 'Profile Tour');
};
window.closeDemoProfile = function() {
  document.getElementById('demo-profile-overlay').classList.remove('show');
};
// ── IN-DEPTH TOUR (home screen walkthrough, free taps, manual steps) ──
const INDEPTH_STEPS = [
  { sel: null, title: 'Welcome to SideKick', text: 'I will explain the Home Page for SideKick and what each button does.' },
  { sel: '#lang-btn', title: 'Language', text: 'SideKick currently supports 8 different languages. Select this to choose which language you would like.' },
  { sel: '#account-btn', title: 'Account', text: 'By creating and logging into a profile, you gain access to a lot more features and personalization!' },
  { sel: '#screen-home [onclick="showCreateRoom()"]', title: 'Host New Room', text: 'Host New Room is how you start using SideKick for your game' },
  { sel: '#host-preset-room-btn', text: 'To use Host Preset, Room You must create and log into your profile, afterwards you can create quick start settings for any of your games so you are only 2 button presses from inviting friends to join you.' },
  { sel: '#screen-home [onclick="showJoinRoom()"]', title: 'Join Room', text: 'If your friend is already hosting a room, you can join their room to start playing.' },
  { sel: '#theme-toggle-btn', title: 'Light & Dark', text: 'SideKick allows you to toggle between light or dark mode.' },
  { sel: '#screen-home [onclick="openSidekickInfo()"]', title: 'Tour', text: 'Here is how you learn about SideKick and all it has to offer!' },
  { sel: '#screen-home [onclick="openDonateOverlay()"]', title: 'Donate', text: 'SideKick is currently 100% free. This is where you can send donations to show your appreciation and support.' },
  { sel: '#screen-home [onclick="openContactOverlay()"]', title: 'Contact', text: 'If you have any questions, feedback or ideas, email us here.' }
];
let indepthStep = 0;
let _editingVoicePresetId = null;
let _editingPresetColor = '';
let _editingPresetAvatar = '';
let _editingPresetDir = '';
let _editingPresetFeatures = {};
window.startInDepthTour = function() {
  try { if (tourMode === 'guided' && tutorialStep > 0) endTutorial(); } catch {}
  tourMode = 'indepth';
  manualSteps = INDEPTH_STEPS;
  updateTourVoiceBtn();
  document.getElementById('tour-title').textContent = 'Home Page Tour';
  indepthStep = 1;
  renderInDepthStep();
  document.getElementById('tutorial-coach').style.display = 'block';
  window.haptic(15);
};
function renderInDepthStep() {
  const steps = manualSteps || INDEPTH_STEPS;
  const total = steps.length;
  const idx = Math.min(Math.max(indepthStep, 1), total) - 1;
  const s = steps[idx];
  if (s && typeof s.enter === 'function') { try { s.enter(); } catch {} }
  window._coachStep = s;
  renderCollapseDefault('m:' + idx);
  setMiniText(s.text);
  quickArm();
  document.getElementById('tutorial-text').innerHTML = s.text;
  const dotsEl = document.getElementById('tutorial-dots');
  if (dotsEl) {
    dotsEl.innerHTML = '';
    for (let i = 1; i <= total; i++) {
      const d = document.createElement('span');
      const on = i === idx + 1, done = i < idx + 1;
      d.style.cssText = 'width:' + (on ? '1.1rem' : '0.4rem') + ';height:0.4rem;border-radius:999rem;background:' + (on ? 'var(--accent)' : (done ? 'var(--accent-light)' : 'rgba(255,255,255,0.2)')) + ';';
      dotsEl.appendChild(d);
    }
  }
  document.getElementById('tutorial-finish-row').style.display = 'none';
  const navRow = document.getElementById('tutorial-nav-row');
  if (navRow) navRow.style.display = 'flex';
  const backBtn = document.querySelector('#tutorial-nav-row button');
  if (backBtn) backBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
  const nextBtns = document.querySelectorAll('#tutorial-nav-row button');
  if (nextBtns[1]) nextBtns[1].textContent = idx === total - 1 ? 'Finish ✓' : 'Next ▶';
  try { positionCoachForStep(s); } catch {}
  tourSpeak();
  tourSpotlight();
  try { requestAnimationFrame(() => tourSpotlight()); } catch {}
}
window.renderInDepthStep = renderInDepthStep;
window.indepthNext = function() {
  if (indepthStep >= (manualSteps || INDEPTH_STEPS).length) { quitTour(); return; }
  indepthStep++;
  renderInDepthStep();
  window.haptic(5);
};
window.indepthBack = function() {
  if (indepthStep > 1) indepthStep--;
  renderInDepthStep();
  window.haptic(5);
};
window.endInDepthTour = function() {
  tourMode = null;
  indepthStep = 0;
  tourStopVoice();
  document.getElementById('tutorial-coach').style.display = 'none';
  try { tourHideSpotlight(); } catch {}
  showScreen('home');
  openSidekickInfo({ quiet: true });
};
window.endTutorial = async function() {
  await tutorialCleanup();
  showScreen('home');
  openSidekickInfo({ quiet: true });
};
window.finishTutorial = async function() {
  await tutorialCleanup();
  showScreen('home');
  openSidekickInfo({ quiet: true });
};
window.openVoicePresetsOverlay = function() {
  renderVoicePresets();
  document.getElementById('voice-presets-overlay').classList.add('show');
};
window.closeVoicePresetsOverlay = function() {
  document.getElementById('voice-presets-overlay').classList.remove('show');
};
function renderVoicePresets() {
  const el = document.getElementById('voice-presets-list');
  if (!el) return;
  const list = window.getVoicePresets();
  if (!list.length) {
    el.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:0.8rem;">No presets yet. Tap + New Preset to save Step 2 & 3 for hosting.</div>';
    return;
  }
  el.innerHTML = '';
  list.forEach(p => {
    const dirLabel = p.turn ? ({cw:'Left', ccw:'Right', both:'Both'}[p.turn.passDirection] || '') : '';
    const featCount = p.features ? Object.values(p.features).filter(Boolean).length : 0;
    el.innerHTML += `<div style="display:flex;align-items:center;gap:0.6rem;padding:0.6rem 0.75rem;background:var(--surface);border:1px solid var(--border);border-radius:0.75rem;">
      <div style="font-size:1.2rem;flex-shrink:0;">🏠</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${window.escapeHtml(p.name)}</div>
        <div style="font-size:0.72rem;color:var(--muted);">${dirLabel ? window.escapeHtml(dirLabel) + ' • ' : ''}${featCount} feature${featCount===1?'':'s'}</div>
      </div>
      <button class="btn-secondary btn-sm" style="padding:0.3rem 0.6rem;font-size:0.75rem;" onclick="openVoicePresetEdit('${p.id}')">Edit</button>
      <button class="btn-primary btn-sm" style="padding:0.3rem 0.6rem;font-size:0.75rem;" onclick="createRoomFromPresetId('${p.id}')">Start</button>
      <button class="btn-secondary btn-sm" style="padding:0.3rem 0.5rem;font-size:0.75rem;color:#ff5c5c;" onclick="deleteVoicePresetConfirm('${p.id}')">✕</button>
    </div>`;
  });
}
window.openVoicePresetEdit = function(id) {
  _editingVoicePresetId = id || null;
  const preset = id ? window.getVoicePresets().find(p=>p.id===id) : null;
  document.getElementById('voice-preset-edit-title').textContent = preset ? 'Edit Preset' : 'New Preset';
  document.getElementById('voice-preset-name').value = preset ? preset.name : '';
  // Step 1: Player Settings
  if (preset && preset.profile) {
    _editingPresetColor = preset.profile.color || '';
    _editingPresetAvatar = preset.profile.avatar || '';
    document.getElementById('voice-preset-player-name').value = preset.profile.name || '';
  } else {
    _editingPresetColor = '';
    _editingPresetAvatar = '';
    document.getElementById('voice-preset-player-name').value = '';
  }
  updatePresetEditColorBtn();
  updatePresetEditAvatarBtn();
  // Init Step 2/3 from preset or reset for new preset (clean slate)
  if (preset && preset.turn) {
    _editingPresetDir = preset.turn.passDirection || (preset.turn.turnMode === 'classic' ? 'cw' : '');
    if (preset.turn.turnMode === 'speedRound') _editingPresetDir = preset.turn.speedMode ? 'both' : _editingPresetDir;
  } else if (preset) {
    _editingPresetDir = '';
  } else {
    // New preset — start with no turn selected
    _editingPresetDir = '';
  }
  if (preset && preset.features) {
    _editingPresetFeatures = { nudge: !!preset.features.nudge, awards: !!preset.features.awards, timers: !!preset.features.timers, vp: !!preset.features.vp, rounds: !!preset.features.rounds, dnd: !!preset.features.dnd, undo: !!preset.features.undo, playerSkip: !!preset.features.playerSkip };
  } else if (preset) {
    _editingPresetFeatures = { nudge: false, awards: false, timers: false, vp: false, status: false, rounds: false, dnd: false, undo: false, playerSkip: false };
  } else {
    // New preset — start with no features selected
    _editingPresetFeatures = { nudge: false, awards: false, timers: false, vp: false, status: false, rounds: false, dnd: false, undo: false, playerSkip: false };
  }
  document.getElementById('voice-preset-edit-overlay').classList.add('show');
  setTimeout(window.updatePresetEditUI, 50);
};
window.updatePresetEditUI = function() {
  const HIDDEN_FEATURES = window.HIDDEN_FEATURES || [];
  document.querySelectorAll('#preset-features-grid .feature-card').forEach(el => {
    const hide = HIDDEN_FEATURES.includes(el.dataset.feature);
    el.style.display = hide ? 'none' : '';
    if (hide) _editingPresetFeatures[el.dataset.feature] = false;
  });
  document.querySelectorAll('#preset-dir-cw, #preset-dir-ccw, #preset-dir-both').forEach(el => el.classList.remove('selected'));
  const dirEl = document.getElementById('preset-dir-' + _editingPresetDir);
  if (dirEl) dirEl.classList.add('selected');
  document.querySelectorAll('#preset-features-grid .feature-card').forEach(el => {
    const k = el.dataset.feature;
    if (el.style.display === 'none') return;
    el.classList.toggle('added', !!_editingPresetFeatures[k]);
  });
};
window.closeVoicePresetEdit = function() {
  document.getElementById('voice-preset-edit-overlay').classList.remove('show');
  _editingVoicePresetId = null;
  _editingPresetDir = '';
  _editingPresetFeatures = {};
  _editingPresetColor = '';
  _editingPresetAvatar = '';
};
function updatePresetEditColorBtn() {
  const btn = document.getElementById('preset-color-btn');
  const label = document.getElementById('preset-color-label');
  if (!btn || !label) return;
  if (_editingPresetColor) {
    const colorName = window.PLAYER_COLORS.find(c => c.hex === _editingPresetColor)?.name || 'Custom';
    btn.style.background = _editingPresetColor;
    btn.style.borderColor = _editingPresetColor;
    btn.classList.toggle('light-fill', window.isLightColor(_editingPresetColor));
    label.textContent = colorName;
    label.style.color = window.isLightColor(_editingPresetColor) ? '#000' : '#fff';
  } else {
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.classList.remove('light-fill');
    label.textContent = 'Choose\nColor';
    label.style.color = '';
  }
}
function updatePresetEditAvatarBtn() {
  const btn = document.getElementById('preset-avatar-btn');
  const label = document.getElementById('preset-avatar-label');
  if (!btn || !label) return;
  const avatar = _editingPresetAvatar;
  if (avatar) {
    btn.classList.add('avatar-filled');
    if (window.isImageAvatar(avatar)) {
      label.textContent = '';
      const img = document.createElement('img');
      img.src = avatar; img.alt = 'avatar';
      img.className = 'avatar-btn-preview';
      label.appendChild(img);
    } else {
      label.textContent = avatar;
      label.style.color = '';
    }
  } else {
    btn.classList.remove('avatar-filled');
    label.textContent = 'Choose\nAvatar';
    label.style.color = '';
  }
}
window.saveCurrentVoicePreset = async function() {
  const name = document.getElementById('voice-preset-name').value.trim();
  if (!name) { window.showToast('Enter a preset name', true); return; }
  if (!_editingPresetDir) { window.showToast('Choose a turn direction (Step 2)', true); return; }
  const playerName = document.getElementById('voice-preset-player-name').value.trim() || '';
  const preset = {
    id: _editingVoicePresetId || ('vp_' + Date.now().toString(36) + Math.random().toString(36).slice(2,5)),
    name: name,
    phrase: window.normalizePhrase(name),
    gameName: name,
    voiceEnabled: false,
    profile: { name: playerName || window.getSavedName()||'', color: _editingPresetColor || window.getSavedColor()||'', avatar: _editingPresetAvatar || getSavedAvatar()||'👤' },
    turn: { turnMode: _editingPresetDir === 'both' ? 'classic' : 'classic', passDirection: _editingPresetDir, speedMode: '' },
    features: {
      nudge: !!_editingPresetFeatures.nudge,
      timers: !!_editingPresetFeatures.timers,
      awards: !!_editingPresetFeatures.awards,
      vp: !!_editingPresetFeatures.vp,
      dnd: !!_editingPresetFeatures.dnd,
      rounds: !!_editingPresetFeatures.rounds,
      undo: !!_editingPresetFeatures.undo,
      playerSkip: !!_editingPresetFeatures.playerSkip
    },
    createdAt: Date.now()
  };
  await window.saveVoicePreset(preset);
  closeVoicePresetEdit();
  renderVoicePresets();
  window.showToast('Preset saved');
};
window.deleteVoicePresetConfirm = async function(id) {
  if (await window.showConfirm('Delete this preset?')) {
    await window.deleteVoicePreset(id);
    renderVoicePresets();
  }
};
window.createRoomFromPresetId = async function(id) {
  const preset = window.getVoicePresets().find(p=>p.id===id);
  if (preset) await createRoomFromPreset(preset);
};

async function createRoomFromPreset(preset) {
  if (!window.requireHostAccount()) return;
  // Apply preset profile to current session (do NOT persist to user profile)
  if (preset.profile) {
    if (preset.profile.name) window.myName = preset.profile.name;
    if (preset.profile.color) window.myColor = preset.profile.color;
    if (preset.profile.avatar) window.roomAvatarSelection = preset.profile.avatar;
  }
  // Apply turn mode if preset has it
  if (preset.turn && preset.turn.turnMode) {
    window.turnMode = preset.turn.turnMode;
    if (preset.turn.passDirection) window.passDirection = preset.turn.passDirection;
    if (preset.turn.speedMode) window.speedMode = preset.turn.speedMode;
  }
  // Apply features — set window mirrors directly (isFeatureEnabled reads from window)
  // Do NOT use setFeatureEnabled() here — it triggers onNudgeToggle/onRoundsToggle which open overlays
  if (preset.features) {
    window.featureNudgeEnabled = !!preset.features.nudge;
    window.featureTimersEnabled = !!preset.features.timers;
    window.featureAwardsEnabled = !!preset.features.awards;
    window.featureVPEnabled = !!preset.features.vp;
    window.featureDndEnabled = !!preset.features.dnd;
    window.featureRoundsEnabled = !!preset.features.rounds;
    window.featureUndoEnabled = !!preset.features.undo;
    window.featurePlayerSkipEnabled = !!preset.features.playerSkip;
  }
  // Use existing create-room flow but skip wizard — directly create lobby
  // Reuse the same logic as showCreateRoom's final step: generate code and set room
  window.isHost = true;
  window.myId = window.uid();
  window.myName = preset.profile ? preset.profile.name : window.getSavedName();
  const claimed = await window.claimRoomCode();
  window.roomCode = claimed.code;
  let roomRef = claimed.roomRef;
  const features = {
    passDirection: (typeof passDirection !== 'undefined' ? passDirection : ''),
    nudge: typeof featureNudgeEnabled !== 'undefined' ? featureNudgeEnabled : false,
    nudgeDelay: typeof featureNudgeEnabled !== 'undefined' && featureNudgeEnabled ? (parseInt(document.getElementById('nudge-delay')?.value)||30) : 0,
    nudgeMode: typeof nudgeMode !== 'undefined' ? nudgeMode : 'multi',
    awards: typeof featureAwardsEnabled !== 'undefined' ? featureAwardsEnabled : false,
    victoryPoints: typeof featureVPEnabled !== 'undefined' ? featureVPEnabled : false,
    dndTurnComponents: typeof featureDndEnabled !== 'undefined' ? featureDndEnabled : false,
    timers: typeof featureTimersEnabled !== 'undefined' ? featureTimersEnabled : false,
    timerTurnOn: false, timerTurnVisible: true, timerRoundOn: false, timerRoundVisible: true, timerGameOn: false, timerGameVisible: true, timerCountdownOn: false, timerCountdownVisible: true, timerCountdownSecs: 30,
    rounds: typeof featureRoundsEnabled !== 'undefined' ? featureRoundsEnabled : false,
    roundsTotal: 0,
    turnMode: typeof turnMode !== 'undefined' ? turnMode : '',
    speedMode: typeof speedMode !== 'undefined' ? speedMode : '',
    speedRoundsTotal: 0,
    undo: typeof featureUndoEnabled !== 'undefined' ? featureUndoEnabled : false,
    playerSkip: typeof featurePlayerSkipEnabled !== 'undefined' ? featurePlayerSkipEnabled : false
  };
  await window.set(roomRef, {
    host: window.myId,
    hostAuthUid: window.currentUser ? window.currentUser.uid : null,
    status: 'lobby',
    activePlayerIndex: 0,
    lastActivity: Date.now(),
    features: features,
    currentRound: 0,
    buzzCurrentRound: 0, buzzPhase: '', buzzScores: {}, buzzTapOrder: {},
    players: { [window.myId]: { name: window.myName, order: 0, joinedAt: Date.now(), color: window.myColor, avatar: window.roomAvatarSelectionvatarSelection || '👤', authUid: currentUser ? currentUser.uid : null } }
  });
  window.haptic(20);
  document.getElementById('display-code').textContent = window.roomCode;
  window.saveSession();
  closeVoicePresetsOverlay();
  const vl = document.getElementById('voice-listening-overlay');
  if (vl) vl.classList.remove('show');
  showScreen('lobby');
  generateLobbyQR();
  listenLobby();
  window.showToast('Started ' + preset.name);
}

