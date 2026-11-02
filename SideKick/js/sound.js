// Buzzer sound for countdown reaching zero
export function playBuzzerSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(1.0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

// ── SOUND MODE (Tone / Name / Mute) ─────────
// App-provided collaborators; defaults keep the module safe when used standalone.
const soundServices = {
  haptic: () => {},
  getLanguage: () => 'en',
  pickVoice: () => null,
};
export function configureSoundServices(services = {}) {
  if (typeof services.haptic === 'function') soundServices.haptic = services.haptic;
  if (typeof services.getLanguage === 'function') soundServices.getLanguage = services.getLanguage;
  if (typeof services.pickVoice === 'function') soundServices.pickVoice = services.pickVoice;
}

export let soundMode = 'tone'; // 'tone' | 'name' | 'mute'
try { const m = localStorage.getItem('sk_sound_mode'); if (m === 'tone' || m === 'name' || m === 'mute') soundMode = m; } catch {}
export function soundModeIcon() { return soundMode === 'mute' ? '🔇' : (soundMode === 'name' ? '🗣️' : '🔊'); }
export function soundModeEnabled() { return soundMode !== 'mute'; }
export function openSoundModeMenu(anchor) {
  const menu = document.getElementById('sound-mode-menu');
  if (!menu) return;
  // position near the tapped button
  const btn = anchor || document.activeElement;
  let top = 60, right = 12;
  if (btn && btn.getBoundingClientRect) {
    const r = btn.getBoundingClientRect();
    right = Math.max(8, window.innerWidth - r.right);
    // Measure menu height (show off-screen first) so we can flip above the
    // button when there isn't room below (button sits at the bottom of screen).
    menu.style.visibility = 'hidden';
    menu.style.top = '0px';
    menu.classList.add('show');
    const mh = menu.offsetHeight || 150;
    menu.classList.remove('show');
    menu.style.visibility = '';
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow >= mh + 12) {
      top = Math.max(8, r.bottom + 6);
    } else {
      top = Math.max(8, r.top - mh - 6);
    }
  }
  menu.style.top = top + 'px';
  menu.style.right = right + 'px';
  menu.style.left = 'auto';
  menu.classList.add('show');
  // highlight active
  menu.querySelectorAll('.sound-mode-opt').forEach(o => {
    o.classList.toggle('active', o.getAttribute('data-mode') === soundMode);
  });
  // close on outside tap
  setTimeout(() => {
    const closer = (ev) => {
      if (!menu.contains(ev.target)) { menu.classList.remove('show'); document.removeEventListener('click', closer, true); document.removeEventListener('touchstart', closer, true); }
    };
    document.addEventListener('click', closer, true);
    document.addEventListener('touchstart', closer, true);
  }, 0);
  try { soundServices.haptic(5); } catch {}
};
export function setSoundMode(mode) {
  if (mode !== 'tone' && mode !== 'name' && mode !== 'mute') return;
  soundMode = mode;
  try { localStorage.setItem('sk_sound_mode', mode); } catch {}
  const menu = document.getElementById('sound-mode-menu');
  if (menu) menu.classList.remove('show');
  updateSoundButtons();
  try { soundServices.haptic(5); } catch {}
};
export function updateSoundButtons() {
  const icon = soundModeIcon();
  const btn = document.getElementById('sound-toggle');
  if (btn) { btn.textContent = icon; btn.classList.toggle('active-ctrl', soundMode !== 'mute'); }
  const activeBtn = document.getElementById('active-sound-btn');
  if (activeBtn) activeBtn.textContent = icon;
  const waitBtn = document.getElementById('active-sound-btn-wait');
  if (waitBtn) waitBtn.textContent = icon;
}
// Back-compat alias used by older code paths
export function toggleSound() { openSoundModeMenu(); }
window.toggleSound = toggleSound;
export function speakName(name) {
  try {
    if (!('speechSynthesis' in window)) return;
    const txt = (name || '').trim();
    if (!txt) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    let voice = null;
    try { voice = soundServices.pickVoice(); } catch {}
    if (voice) u.voice = voice;
    try { u.lang = soundServices.getLanguage() || 'en'; } catch { u.lang = 'en'; }
    u.pitch = 1.1; u.rate = 0.95; u.volume = 1;
    speechSynthesis.speak(u);
  } catch {}
}

// ── ORIENTATION CONTROL ──────────────────────
export function resetOrientation() {
  try { screen.orientation.lock('portrait-primary').catch(()=>{}); } catch(e) {}
}
// Attempt to lock on every page interaction (iOS PWA requires user gesture)
// Only on touch devices — desktop browsers don't support orientation lock and the constant failing calls waste CPU
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  ['touchstart','click','keydown'].forEach(evt => {
    document.addEventListener(evt, () => {
      try { screen.orientation.lock('portrait-primary').catch(()=>{}); } catch(e) {}
    }, { once: false, passive: true });
  });
}

// ── WAKE LOCK (keep screen on at all times) ──────────────
let wakeLock = null;
export async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch(e) {}
}
export async function releaseWakeLock() {
  try { if (wakeLock) { await wakeLock.release(); wakeLock = null; } } catch(e) {}
}
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && wakeLock === null) {
    await requestWakeLock();
  }
  // Keep audio session alive when backgrounded (iOS PWA hack only)
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    try {
      const bgAudio = document.getElementById('bg-keep-alive');
      if (bgAudio) {
        if (document.visibilityState === 'hidden') {
          bgAudio.currentTime = 0;
          bgAudio.play().catch(() => {});
        }
      }
    } catch(e) {}
  }
});
// Request wake lock immediately on load
if (document.visibilityState === 'visible') requestWakeLock();


// ── CUSTOM SOUND FILES ────────────────────────
// Place your .mp3 files in the same folder as sidekick.html.
// Set the path below to enable each sound. Leave as null to use the
// built-in synthesized sound instead.
//
//   sounds/pass-turn.mp3   — plays when it becomes your turn
//   sounds/nudge.mp3       — plays on the active player's screen when nudged
//   sounds/awards-voice.mp3 — plays instead of Web Speech API during awards ceremony
//
const CUSTOM_SOUNDS = {
  turnPass:    null,  // e.g. 'sounds/pass-turn.mp3'
  nudge:       'sounds/notif11.mp3',  // e.g. 'sounds/nudge.mp3'
  awardsVoice: null,   // e.g. 'sounds/awards-voice.mp3'
};

// Preload Audio objects once paths are set
const _audioCache = {};
export function getCustomAudio(key) {
  if (!CUSTOM_SOUNDS[key]) return null;
  if (!_audioCache[key]) {
    _audioCache[key] = new Audio(CUSTOM_SOUNDS[key]);
    _audioCache[key].load();
  }
  return _audioCache[key];
}

export function playCustomOrFallback(key, fallbackFn) {
  const audio = getCustomAudio(key);
  if (audio) {
    audio.volume = 1.0;
    audio.currentTime = 0;
    audio.play().catch(() => fallbackFn());
  } else {
    fallbackFn();
  }
}

// ── iOS AUDIO UNLOCK ──────────────────────────
let audioCtx = null;
export function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}
document.addEventListener('touchstart', () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: false });

// ── SOUND ──────────────────────────────────
export function playTurnSound() {
  playCustomOrFallback('turnPass', _playTurnSoundSynth);
}

export function _playTurnSoundSynth() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [[220, 0, 0.12], [440, 0.13, 0.25], [660, 0.22, 0.4]].forEach(([freq, start, end]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(1.0, now + start + 0.04);
      gain.gain.linearRampToValueAtTime(0, now + end);
      osc.start(now + start);
      osc.stop(now + end + 0.05);
    });
  } catch(e) {}
}

export function playNudgeSound() {
  playCustomOrFallback('nudge', _playNudgeSoundSynth);
}

export function _playNudgeSoundSynth() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [[400, 0, 0.08], [300, 0.1, 0.18]].forEach(([freq, start, end]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(1.0, now + start);
      gain.gain.linearRampToValueAtTime(0, now + end);
      osc.start(now + start);
      osc.stop(now + end + 0.02);
    });
  } catch(e) {}
}





window.openSoundModeMenu = openSoundModeMenu;
window.setSoundMode = setSoundMode;

// ── Expose to HTML onclick handlers ─────────
window.openSoundModeMenu = openSoundModeMenu;
window.setSoundMode = setSoundMode;
window.toggleSound = toggleSound;
window.updateSoundButtons = updateSoundButtons;
