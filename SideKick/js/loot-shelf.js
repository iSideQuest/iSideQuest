// Loot Shelf — independent module
// Completely separate from My Collection and Collection Shelf.
// Own data store, own UI, own rendering.

const LOOT_KEY_PREFIX = 'sk_loot_';

let lootState = { items: [] };
let lootServices = {
  showAlert: (msg) => { if (window.showAlert) window.showAlert(msg); },
  haptic: () => {},
};

export function configureLootShelf(services = {}) {
  Object.assign(lootServices, services);
}

// ── Data layer ──
function lootKey() {
  const user = lootServices.getCurrentUser ? lootServices.getCurrentUser() : null;
  const uid = user && user.uid ? user.uid : 'guest';
  return LOOT_KEY_PREFIX + uid;
}

function loadLootLocal() {
  try { return JSON.parse(localStorage.getItem(lootKey()) || '[]'); } catch (e) { return []; }
}

function saveLootLocal(list) {
  try { localStorage.setItem(lootKey(), JSON.stringify(list)); } catch (e) {}
}

export async function loadLoot() {
  lootState.items = loadLootLocal();
  return lootState.items;
}

export function saveLootLocalNow() {
  saveLootLocal(lootState.items);
}

// ── UI ──
export function openLootShelf() {
  if (window.showScreen) window.showScreen('loot-shelf');
  requestAnimationFrame(function() {
    loadLoot().then(function() { renderLootShelf(); }).catch(function() { renderLootShelf(); });
  });
}

export function closeLootShelf() {
  if (window.showScreen) window.showScreen('profile');
}

// ── Add Game overlay ──
export function openLootAddGame() {
  var overlay = document.getElementById('loot-add-game-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loot-add-game-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.zIndex = '10000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '1rem';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML =
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:0.75rem;padding:1rem;max-width:90vw;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;gap:0.6rem;width:100%;">' +
    '<div style="font-size:1.1rem;font-weight:800;color:var(--text);text-align:center;">Add Game</div>' +
    '<input id="loot-game-name" placeholder="Game name" maxlength="40" style="width:100%;margin-bottom:0.3rem;">' +
    '<div style="font-size:0.72rem;color:var(--muted);text-align:center;margin-bottom:0.2rem;">Upload Image</div>' +
    '<div style="display:flex;gap:0.4rem;justify-content:center;margin-bottom:0.3rem;">' +
    '<button class="btn-secondary btn-sm" onclick="document.getElementById('loot-game-photo').click()">📷 Choose Image</button>' +
    '</div>' +
    '<input type="file" id="loot-game-photo" accept="image/*" style="display:none;" onchange="previewLootGamePhoto(this)">' +
    '<div id="loot-game-photo-preview" style="display:none;text-align:center;margin-bottom:0.3rem;">' +
    '<img id="loot-game-photo-img" alt="" style="width:6rem;height:6rem;object-fit:cover;border-radius:0.5rem;border:1px solid var(--border);margin:0 auto;">' +
    '</div>' +
    '<div style="font-size:0.72rem;color:var(--muted);text-align:center;margin-bottom:0.2rem;">Rating (0-10)</div>' +
    '<div id="loot-rating-stars" style="display:flex;gap:0.15rem;justify-content:center;cursor:pointer;" onclick="handleLootRatingClick(event)"></div>' +
    '<div style="text-align:center;font-size:0.85rem;color:var(--text);margin-bottom:0.3rem;"><span id="loot-rating-value">0</span>/10</div>' +
    '<button class="btn-primary" style="width:100%;margin-top:0.5rem;" onclick="submitLootGame()">Add</button>' +
    '<button class="btn-secondary btn-sm" style="width:100%;margin-top:0.3rem;" onclick="closeLootAddGame()">Back</button>' +
    '</div>';
  overlay.style.display = 'flex';
  // Render initial stars
  renderLootRatingStars(0);
  // Store photo data
  window._lootPhotoData = null;
}

export function closeLootAddGame() {
  var overlay = document.getElementById('loot-add-game-overlay');
  if (overlay) overlay.style.display = 'none';
}

function renderLootRatingStars(rating) {
  var container = document.getElementById('loot-rating-stars');
  if (!container) return;
  var html = '';
  for (var i = 1; i <= 10; i++) {
    var full = rating >= i;
    var half = rating >= i - 0.5 && rating < i;
    html += '<span data-star="' + i + '" style="font-size:1.2rem;cursor:pointer;color:' + (full ? '#ffcc00' : half ? '#ffcc00' : '#555') + ';">' + (full ? '★' : half ? 'isory' : '☆') + '</span>';
  }
  container.innerHTML = html;
  var valEl = document.getElementById('loot-rating-value');
  if (valEl) valEl.textContent = rating;
}

window.handleLootRatingClick = function(e) {
  var star = e.target.closest('[data-star]');
  if (!star) return;
  var starNum = parseInt(star.getAttribute('data-star'));
  var rect = star.getBoundingClientRect();
  var clickX = e.clientX - rect.left;
  var isHalf = clickX < rect.width / 2;
  var rating = isHalf ? starNum - 0.5 : starNum;
  if (rating < 0) rating = 0;
  window._lootRating = rating;
  renderLootRatingStars(rating);
};

window.previewLootGamePhoto = function(input) {
  if (!input || !input.files || !input.files[0]) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById('loot-game-photo-preview');
    var img = document.getElementById('loot-game-photo-img');
    if (preview) preview.style.display = 'block';
    if (img) img.src = e.target.result;
    window._lootPhotoData = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
};

window.submitLootGame = function() {
  var nameEl = document.getElementById('loot-game-name');
  var name = nameEl ? nameEl.value.trim() : '';
  if (!name) {
    if (shelfServices.showAlert) shelfServices.showAlert('Enter a game name.');
    return;
  }
  var game = {
    id: 'loot_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name,
    photo: window._lootPhotoData || null,
    rating: window._lootRating || 0,
    minPlayers: 0,
    maxPlayers: 0,
    playTime: '',
    notes: '',
    categories: [],
    mechanics: [],
    favorite: false,
    order: lootState.items.length,
    createdAt: Date.now()
  };
  lootState.items.push(game);
  saveLootLocal(lootState.items);
  // Sync to Firebase
  try {
    const user = (window.currentUser || null);
    const db = (typeof window.db !== 'undefined') ? window.db : null;
    if (db && user && user.uid) {
      const gameCopy = Object.assign({}, game);
      delete gameCopy.photo;
      if (window.set) window.set(window.ref(db, 'users/' + user.uid + '/loot/' + game.id), gameCopy);
      if (game.photo && window.set) window.set(window.ref(db, 'privatePhotos/' + user.uid + '/' + game.id), game.photo);
    }
  } catch (e) {}
  window._lootPhotoData = null;
  window._lootRating = 0;
  closeLootAddGame();
  renderLootShelf();
  if (shelfServices.haptic) try { shelfServices.haptic(5); } catch {}
};

window.closeLootAddGame = function() {
  var overlay = document.getElementById('loot-add-game-overlay');
  if (overlay) overlay.style.display = 'none';
};

// ── Window exposures ──
window.openLootShelf = openLootShelf;
window.closeLootShelf = closeLootShelf;
window.renderLootShelf = renderLootShelf;
window.openLootAddGame = openLootAddGame;
window.closeLootAddGame = closeLootAddGame;

export function renderLootShelf() {
  const container = document.getElementById('loot-shelf-container');
  if (!container) return;
  const items = lootState.items || [];
  if (!items.length) {
    container.innerHTML = '<div class="loot-empty">Your loot shelf is empty.</div>';
    return;
  }
  // 3 columns, 4 rows = 12 slots
  const perRow = 3;
  const maxSlots = 12;
  const colors = ['#4a6fa5','#6a8f5a','#a56a4a','#8a5a8f','#5a8fa5','#a5a55a','#a55a6a','#5a5a8f'];
  let html = '<div class="loot-grid">';
  for (let i = 0; i < maxSlots; i++) {
    const item = items[i] || null;
    if (item) {
      const color = colors[i % colors.length];
      const name = item.name || 'Item';
      const photo = item.photo ? '<img class="loot-tile-photo" src="' + item.photo + '" alt="">' : '';
      html += '<div class="loot-tile" style="background:' + color + ';" data-index="' + i + '">';
      html += '<div class="loot-tile-name">' + name + '</div>';
      html += photo;
      html += '</div>';
    } else {
      html += '<div class="loot-tile loot-tile-empty"></div>';
    }
  }
  html += '</div>';
  container.innerHTML = html;
}

// ── Window exposures ──
window.openLootShelf = openLootShelf;
window.closeLootShelf = closeLootShelf;
window.renderLootShelf = renderLootShelf;