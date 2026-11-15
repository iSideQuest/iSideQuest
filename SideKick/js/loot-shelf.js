// Loot Shelf - independent module
// Own data store, own UI, no dependencies on other modules

const LOOT_KEY = 'sk_loot_shelf';

let lootItems = [];

export function configureLootShelf(services) {
  // no-op for now, kept for API compatibility
}

export function openLootShelf() {
  if (window.showScreen) window.showScreen('loot-shelf');
  loadLoot();
  renderLootShelf();
}

export function closeLootShelf() {
  if (window.showScreen) window.showScreen('profile');
}

function loadLoot() {
  try {
    var raw = localStorage.getItem(LOOT_KEY);
    lootItems = raw ? JSON.parse(raw) : [];
  } catch (e) {
    lootItems = [];
  }
}

function saveLoot() {
  try { localStorage.setItem(LOOT_KEY, JSON.stringify(lootItems)); } catch (e) {}
}

export function renderLootShelf() {
  var container = document.getElementById('loot-shelf-container');
  if (!container) return;
  var html = '<div class="loot-grid">';
  for (var i = 0; i < 12; i++) {
    var item = lootItems[i] || null;
    if (item) {
      html += '<div class="loot-tile" data-index="' + i + '">';
      html += '<div class="loot-tile-name">' + escapeHtml(item.name || 'Item') + '</div>';
      html += '</div>';
    } else {
      html += '<div class="loot-tile loot-tile-empty"></div>';
    }
  }
  html += '</div>';
  container.innerHTML = html;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.openLootShelf = openLootShelf;
window.closeLootShelf = closeLootShelf;
window.renderLootShelf = renderLootShelf;