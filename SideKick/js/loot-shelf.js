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
  var items = lootItems || [];
  var colors = ['#4a6fa5','#6a8f5a','#a56a4a','#8a5a8f','#5a8fa5','#a5a55a','#a55a6a','#5a5a8f'];
  var placeholderImages = [
    'https://picsum.photos/seed/loot1/200/200',
    'https://picsum.photos/seed/loot2/200/200',
    'https://picsum.photos/seed/loot3/200/200',
    'https://picsum.photos/seed/loot4/200/200',
    'https://picsum.photos/seed/loot5/200/200',
    'https://picsum.photos/seed/loot6/200/200',
    'https://picsum.photos/seed/loot7/200/200',
    'https://picsum.photos/seed/loot8/200/200',
  ];
  var html = '<div class="loot-grid">';
  for (var i = 0; i < 12; i++) {
    var item = items[i] || null;
    if (item) {
      var color = colors[i % colors.length];
      var name = item.name || 'Item';
      var photo = item.photo ? '<img class="loot-tile-photo" src="' + item.photo + '" alt="">' : '';
      html += '<div class="loot-tile" style="background:' + color + ';" data-index="' + i + '">';
      html += '<div class="loot-tile-name">' + name + '</div>';
      html += photo;
      html += '</div>';
    } else {
      // Use random placeholder image for testing
      var imgUrl = placeholderImages[i % placeholderImages.length];
      html += '<div class="loot-tile" style="background:#333;" data-index="' + i + '">';
      html += '<img class="loot-tile-photo" src="' + imgUrl + '" alt="Test Game">';
      html += '<div class="loot-tile-name">Test Game ' + (i + 1) + '</div>';
      html += '</div>';
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