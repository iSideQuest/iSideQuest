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