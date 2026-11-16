// Loot Shelf - independent module
// Own data store, own UI, no dependencies on other modules

const LOOT_KEY = 'sk_loot_shelf';

let lootItems = [];
let lootPage = 0;

export function configureLootShelf(services) {
  // no-op for now, kept for API compatibility
}

export function openLootShelf() {
  if (window.showScreen) window.showScreen('loot-shelf');
  loadLoot();
  lootPage = 0;
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
  var countEl = document.getElementById('loot-shelf-count');
  if (countEl) countEl.textContent = lootItems.length ? '(' + lootItems.length + ')' : '';
  var items = lootItems || [];
  if (!items.length) {
    container.innerHTML = '<div class="loot-empty">Your loot shelf is empty.</div>';
    return;
  }
  var perPage = 12;
  var totalPages = Math.ceil(items.length / perPage);
  if (lootPage >= totalPages) lootPage = totalPages - 1;
  if (lootPage < 0) lootPage = 0;
  var startIdx = lootPage * perPage;
  var pageItems = items.slice(startIdx, startIdx + perPage);
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
  for (var i = 0; i < perPage; i++) {
    var item = pageItems[i] || null;
    var globalIdx = startIdx + i;
    if (item) {
      var color = colors[globalIdx % colors.length];
      var name = item.name || 'Item';
      var photo = item.photo ? '<img class="loot-tile-photo" src="' + item.photo + '" alt="">' : '';
      html += '<div class="loot-tile" style="background:' + color + ';" data-index="' + globalIdx + '">';
      html += '<div class="loot-tile-name">' + escapeHtml(name) + '</div>';
      html += photo;
      html += '</div>';
    } else {
      var imgUrl = placeholderImages[globalIdx % placeholderImages.length];
      html += '<div class="loot-tile" style="background:#333;" data-index="' + globalIdx + '">';
      html += '<img class="loot-tile-photo" src="' + imgUrl + '" alt="Test Game">';
      html += '<div class="loot-tile-name">Test Game ' + (globalIdx + 1) + '</div>';
      html += '</div>';
    }
  }
  html += '</div>';
  // Add page navigation if multiple pages
  if (totalPages > 1) {
    html += '<div class="loot-page-nav">';
    html += '<button class="btn-secondary btn-sm" onclick="lootPrevPage()" ' + (lootPage <= 0 ? 'disabled' : '') + '>Prev</button>';
    html += '<span style="color:var(--muted);font-size:0.8rem;">Page ' + (lootPage + 1) + ' of ' + totalPages + '</span>';
    html += '<button class="btn-secondary btn-sm" onclick="lootNextPage()" ' + (lootPage >= totalPages - 1 ? 'disabled' : '') + '>Next</button>';
    html += '</div>';
  }
  container.innerHTML = html;
  // Add swipe handlers
  addSwipeHandlers(container);
}

function addSwipeHandlers(container) {
  var startX = 0;
  var startY = 0;
  var isSwiping = false;
  container.ontouchstart = function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isSwiping = true;
  };
  container.ontouchend = function(e) {
    if (!isSwiping) return;
    isSwiping = false;
    var endX = e.changedTouches[0].clientX;
    var endY = e.changedTouches[0].clientY;
    var diffX = endX - startX;
    var diffY = endY - startY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX < 0) {
        lootNextPage();
      } else {
        lootPrevPage();
      }
    }
  };
}

window.lootPrevPage = function() {
  if (lootPage > 0) {
    lootPage--;
    renderLootShelf();
  }
};

window.lootNextPage = function() {
  var items = lootItems || [];
  var totalPages = Math.ceil(items.length / 12);
  if (lootPage < totalPages - 1) {
    lootPage++;
    renderLootShelf();
  }
};

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  // Build overlay using DOM methods to avoid quote issues
  overlay.innerHTML = '';
  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:0.75rem;padding:1rem;max-width:90vw;max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;gap:0.6rem;width:100%;';

  var title = document.createElement('div');
  title.style.cssText = 'font-size:1.1rem;font-weight:800;color:var(--text);text-align:center;';
  title.textContent = 'Add Game';
  modal.appendChild(title);

  var nameInput = document.createElement('input');
  nameInput.id = 'loot-game-name';
  nameInput.placeholder = 'Game name';
  nameInput.maxLength = 40;
  nameInput.style.cssText = 'width:100%;margin-bottom:0.3rem;';
  modal.appendChild(nameInput);

  var uploadLabel = document.createElement('div');
  uploadLabel.style.cssText = 'font-size:0.72rem;color:var(--muted);text-align:center;margin-bottom:0.2rem;';
  uploadLabel.textContent = 'Upload Image';
  modal.appendChild(uploadLabel);

  var uploadBtn = document.createElement('button');
  uploadBtn.className = 'btn-secondary btn-sm';
  uploadBtn.textContent = 'Choose Image';
  uploadBtn.style.cssText = 'margin:0 auto;display:block;margin-bottom:0.3rem;';
  uploadBtn.addEventListener('click', function() {
    document.getElementById('loot-game-photo').click();
  });
  modal.appendChild(uploadBtn);

  var fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'loot-game-photo';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', function() {
    previewLootGamePhoto(this);
  });
  modal.appendChild(fileInput);

  var previewWrap = document.createElement('div');
  previewWrap.id = 'loot-game-photo-preview';
  previewWrap.style.cssText = 'display:none;text-align:center;margin-bottom:0.3rem;';
  var previewImg = document.createElement('img');
  previewImg.id = 'loot-game-photo-img';
  previewImg.alt = '';
  previewImg.style.cssText = 'width:6rem;height:6rem;object-fit:cover;border-radius:0.5rem;border:1px solid var(--border);margin:0 auto;display:block;';
  previewWrap.appendChild(previewImg);
  modal.appendChild(previewWrap);

  var ratingLabel = document.createElement('div');
  ratingLabel.style.cssText = 'font-size:0.72rem;color:var(--muted);text-align:center;margin-bottom:0.2rem;';
  ratingLabel.textContent = 'Rating (0-10)';
  modal.appendChild(ratingLabel);

  var starsContainer = document.createElement('div');
  starsContainer.id = 'loot-rating-stars';
  starsContainer.style.cssText = 'display:flex;gap:0.15rem;justify-content:center;cursor:pointer;margin-bottom:0.2rem;';
  modal.appendChild(starsContainer);

  var ratingValue = document.createElement('div');
  ratingValue.style.cssText = 'text-align:center;font-size:0.85rem;color:var(--text);margin-bottom:0.3rem;';
  ratingValue.innerHTML = '<span id="loot-rating-value">0</span>/10';
  modal.appendChild(ratingValue);

  var addBtn = document.createElement('button');
  addBtn.className = 'btn-primary';
  addBtn.style.cssText = 'width:100%;margin-top:0.5rem;';
  addBtn.textContent = 'Add';
  addBtn.addEventListener('click', submitLootGame);
  modal.appendChild(addBtn);

  var backBtn = document.createElement('button');
  backBtn.className = 'btn-secondary btn-sm';
  backBtn.style.cssText = 'width:100%;margin-top:0.3rem;';
  backBtn.textContent = 'Back';
  backBtn.addEventListener('click', closeLootAddGame);
  modal.appendChild(backBtn);

  overlay.appendChild(modal);
  overlay.style.display = 'flex';

  window._lootRating = 0;
  window._lootPhotoData = null;
  renderLootRatingStars(0);
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
    var starColor = full ? '#ffcc00' : half ? '#b8960b' : '#555';
    var opacity = half ? '0.6' : '1';
    var starChar = (full || half) ? '\u2605' : '\u2606';
    html += '<span data-star="' + i + '" style="font-size:1.1rem;cursor:pointer;color:' + starColor + ';opacity:' + opacity + ';">' + starChar + '</span>';
  }
  container.innerHTML = html;
  var valEl = document.getElementById('loot-rating-value');
  if (valEl) valEl.textContent = rating;
  container.onclick = function(e) {
    var star = e.target.closest('[data-star]');
    if (!star) return;
    var starNum = parseInt(star.getAttribute('data-star'));
    var rect = star.getBoundingClientRect();
    var clickX = e.clientX - rect.left;
    var isHalf = clickX < rect.width / 2;
    var r = isHalf ? starNum - 0.5 : starNum;
    if (r < 0) r = 0;
    window._lootRating = r;
    renderLootRatingStars(r);
  };
}

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
    if (window.showAlert) window.showAlert('Enter a game name.');
    return;
  }
  var game = {
    id: 'loot_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name,
    photo: window._lootPhotoData || null,
    rating: window._lootRating || 0,
    order: lootItems.length,
    createdAt: Date.now()
  };
  lootItems.push(game);
  saveLoot();
  window._lootPhotoData = null;
  window._lootRating = 0;
  closeLootAddGame();
  renderLootShelf();
  if (window.showAlert) window.showAlert('Game added!');
};

export function closeLootAddGame() {
  var overlay = document.getElementById('loot-add-game-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ── Window exposures ──
window.openLootShelf = openLootShelf;
window.closeLootShelf = closeLootShelf;
window.renderLootShelf = renderLootShelf;
window.openLootAddGame = openLootAddGame;
window.closeLootAddGame = closeLootAddGame;
window.lootPrevPage = function() {
  if (lootPage > 0) {
    lootPage--;
    renderLootShelf();
  }
};
window.lootNextPage = function() {
  var items = lootItems || [];
  var totalPages = Math.ceil(items.length / 12);
  if (lootPage < totalPages - 1) {
    lootPage++;
    renderLootShelf();
  }
};