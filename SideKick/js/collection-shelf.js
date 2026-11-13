import { collectionState, loadCollection, saveCollectionLocal } from './collection-store.js?v=353';

const shelfServices = {
  showAlert: (msg) => { if (window.showAlert) window.showAlert(msg); },
  haptic: () => {},
  openCollectionDetail: (id) => { if (window.openCollectionDetail) window.openCollectionDetail(id); },
};

export function configureShelf(services = {}) {
  Object.assign(shelfServices, services);
}

// Drag state
let dragState = null;
let longPressTimer = null;

// ── PUBLIC ──
export function openCollectionShelf() {
  if (window.showScreen) window.showScreen('collection-shelf');
  requestAnimationFrame(function() {
    loadCollection().then(function() { renderShelf(); }).catch(function() { renderShelf(); });
  });
}

export function closeCollectionShelf() {
  cancelDrag();
  if (window.showScreen) window.showScreen('profile');
}

export function renderShelf() {
  const container = document.getElementById('shelf-container');
  if (!container) return;
  const searchEl = document.getElementById('shelf-search');
  const query = (searchEl && searchEl.value || '').trim().toLowerCase();
  const games = (collectionState && collectionState.games) ? collectionState.games.slice().sort(function(a, b) { return (a.order != null ? a.order : 0) - (b.order != null ? b.order : 0); }) : [];
  let filtered = games;
  if (window._shelfFilters) {
    if (window._shelfFilters.players) {
      const p = window._shelfFilters.players;
      filtered = filtered.filter(function(g) {
        if (p === 5) { return (g.maxPlayers || 0) >= 5; }
        return (g.maxPlayers || 0) === p;
      });
    }
    if (window._shelfFilters.type) {
      filtered = filtered.filter(function(g) {
        return (g.categories || []).indexOf(window._shelfFilters.type) !== -1;
      });
    }
    if (window._shelfFilters.favorite) {
      filtered = filtered.filter(function(g) { return g.favorite === true; });
    }
    if (window._shelfFilters.top) {
      filtered = filtered.filter(function(g) { return (g.rating || 0) >= 4; });
    }
  }
  filtered = query ? filtered.filter(function(g) { return (g.name || '').toLowerCase().indexOf(query) !== -1; }) : filtered;
  const countEl = document.getElementById('shelf-count');
  if (countEl) countEl.textContent = games.length ? '(' + games.length + ')' : '';
  if (!filtered.length) {
    container.innerHTML = '<div class="shelf-empty">' + (games.length ? 'No games match your search.' : 'Your collection is empty.<br>Add games from My Collection first.') + '</div>';
    return;
  }
  const perRow = 3;
  const rows = [];
  for (let i = 0; i < filtered.length; i += perRow) {
    rows.push(filtered.slice(i, i + perRow));
  }
  const colors = ['#4a6fa5','#6a8f5a','#a56a4a','#8a5a8f','#5a8fa5','#a5a55a','#a55a6a','#5a5a8f'];
  let html = '<div class="shelf-unit">';
  rows.forEach(function(row, ri) {
    html += '<div class="shelf-row">';
    row.forEach(function(g, gi) {
      const color = colors[(ri * perRow + gi) % colors.length];
      const name = (g.name || 'Untitled');
      const photo = g.photo ? '<img class="shelf-game-photo" src="' + g.photo + '" alt="">' : '';
      const spine = !g.photo ? '<div class="shelf-game-spine">' + name + '</div>' : '';
      html += '<div class="shelf-game" style="background:' + color + ';" data-game-id="' + g.id + '" title="' + name + '">' + photo + spine + '</div>';
    });
    html += '</div>';
  });
  // Add button cell
  html += '<div class="shelf-row"><div class="shelf-game shelf-game-add" data-action="add" title="Add Game"><div class="shelf-game-spine">+</div></div></div>';
  html += '</div>';
  container.innerHTML = html;
  // Add event handlers to game tiles
  container.querySelectorAll('.shelf-game:not(.shelf-game-add)').forEach(function(el) {
    const gameId = el.getAttribute('data-game-id');
    el.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      longPressTimer = setTimeout(function() {
        longPressTimer = null;
        startDrag(gameId, el, e);
      }, 500);
    });
    el.addEventListener('pointerup', function(e) {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      if (dragState && dragState.dragging) {
        // Drop handled by global pointerup (already fired or will fire)
      } else if (!dragState) {
        openShelfGameDetail(gameId);
      }
    });
    el.addEventListener('pointerleave', function() {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    });
    el.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  });
  // Add button handler
  var addBtn = container.querySelector('.shelf-game-add');
  if (addBtn) {
    addBtn.addEventListener('pointerup', function(e) {
      e.preventDefault();
      if (window.openCollectionEdit) window.openCollectionEdit(null);
    });
  }
  // Global drag listeners (only add once)
  if (!window._shelfDragListenersAdded) {
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp, { passive: false });
    window._shelfDragListenersAdded = true;
  }
}

function startDrag(gameId, el, e) {
  longPressTimer = null;
  const rect = el.getBoundingClientRect();
  const ghost = el.cloneNode(true);
  ghost.classList.add('shelf-drag-ghost');
  ghost.style.position = 'fixed';
  ghost.style.left = (e.clientX - rect.width / 2) + 'px';
  ghost.style.top = (e.clientY - rect.height / 2) + 'px';
  ghost.style.width = rect.width + 'px';
  ghost.style.height = rect.height + 'px';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '10000';
  ghost.style.opacity = '0.9';
  ghost.style.transform = 'scale(1.05) rotate(2deg)';
  document.body.appendChild(ghost);
  el.style.opacity = '0.3';
  dragState = {
    gameId: gameId,
    ghost: ghost,
    targetId: null,
    dragging: true,
  };
  if (shelfServices.haptic) try { shelfServices.haptic(10); } catch {}
}

function onPointerMove(e) {
  if (!dragState || !dragState.ghost) return;
  const ghostRect = dragState.ghost.getBoundingClientRect();
  dragState.ghost.style.left = (e.clientX - ghostRect.width / 2) + 'px';
  dragState.ghost.style.top = (e.clientY - ghostRect.height / 2) + 'px';
  document.querySelectorAll('.shelf-game:not(.shelf-game-add)').forEach(function(el) {
    el.classList.remove('shelf-drag-target');
  });
  const target = document.elementFromPoint(e.clientX, e.clientY);
  const targetGame = target ? target.closest('.shelf-game:not(.shelf-game-add)') : null;
  if (targetGame && targetGame.getAttribute('data-game-id') !== dragState.gameId) {
    targetGame.classList.add('shelf-drag-target');
    dragState.targetId = targetGame.getAttribute('data-game-id');
  } else {
    dragState.targetId = null;
  }
}

function onPointerUp(e) {
  if (!dragState) return;
  if (dragState.ghost) { dragState.ghost.remove(); dragState.ghost = null; }
  document.querySelectorAll('.shelf-game').forEach(function(el) {
    el.style.opacity = '';
    el.classList.remove('shelf-drag-target');
  });
  if (dragState.targetId && dragState.targetId !== dragState.gameId) {
    swapGames(dragState.gameId, dragState.targetId);
    renderShelf();
  }
  dragState = null;
}

function cancelDrag() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  if (dragState) {
    if (dragState.ghost) dragState.ghost.remove();
    document.querySelectorAll('.shelf-game').forEach(function(el) {
      el.style.opacity = '';
      el.classList.remove('shelf-drag-target');
    });
    dragState = null;
  }
}

function swapGames(id1, id2) {
  const games = collectionState.games;
  const idx1 = games.findIndex(function(g) { return g.id === id1; });
  const idx2 = games.findIndex(function(g) { return g.id === id2; });
  if (idx1 < 0 || idx2 < 0 || idx1 === idx2) return;
  const tmp = games[idx1];
  games[idx1] = games[idx2];
  games[idx2] = tmp;
  games.forEach(function(g, i) { g.order = i; });
  saveCollectionLocal(games);
  try {
    const user = (window.currentUser || null);
    const db = (typeof window.db !== 'undefined') ? window.db : null;
    if (db && user && user.uid) {
      const updates = {};
      games.forEach(function(g) {
        updates['users/' + user.uid + '/collection/' + g.id + '/order'] = g.order;
      });
      if (window.update) window.update(window.ref(db, '/'), updates).catch(function() {});
    }
  } catch (e) {}
  if (shelfServices.haptic) try { shelfServices.haptic(5); } catch {}
}

export function pickRandomShelfGame() {
  const games = (collectionState && collectionState.games) ? collectionState.games : [];
  if (!games.length) { if (window.showAlert) window.showAlert('Your collection is empty.'); return; }
  const pick = games[Math.floor(Math.random() * games.length)];
  if (pick) {
    const searchEl = document.getElementById('shelf-search');
    if (searchEl) searchEl.value = pick.name || '';
    renderShelf();
  }
}

export function openShelfGameDetail(id) {
  window._shelfReturn = true;
  var co = document.getElementById('collection-overlay');
  if (co) co.style.display = 'flex';
  if (window.openCollectionDetail) window.openCollectionDetail(id);
}

export function closeShelfGameDetail() {
  window._shelfReturn = false;
  document.getElementById('collection-detail').style.display = 'none';
  document.getElementById('collection-overlay').style.display = 'none';
  if (window.showScreen) window.showScreen('collection-shelf');
  if (window.renderShelf) window.renderShelf();
}

export function clearShelfFilters() {
  const searchEl = document.getElementById('shelf-search');
  if (searchEl) searchEl.value = '';
  renderShelf();
}

// Back button handler from shelf detail view
window.closeCollectionDetailFromShelf = function() {
  window._shelfReturn = false;
  document.getElementById('collection-detail').style.display = 'none';
  document.getElementById('collection-overlay').style.display = 'none';
  if (window.showScreen) window.showScreen('collection-shelf');
  if (window.renderShelf) window.renderShelf();
};

export function openShelfFilters() {
  var filterOverlay = document.getElementById('shelf-filter-overlay');
  if (!filterOverlay) {
    filterOverlay = document.createElement('div');
    filterOverlay.id = 'shelf-filter-overlay';
    filterOverlay.style.position = 'fixed';
    filterOverlay.style.inset = '0';
    filterOverlay.style.background = 'rgba(0,0,0,0.85)';
    filterOverlay.style.zIndex = '10000';
    filterOverlay.style.display = 'flex';
    filterOverlay.style.alignItems = 'center';
    filterOverlay.style.justifyContent = 'center';
    filterOverlay.innerHTML =
      '<div style="background:var(--surface);border:1px solid var(--border);border-radius:0.75rem;padding:1rem;max-width:90vw;max-height:90vh;overflow-y:auto;">' +
      '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">' +
      '<button class="btn-secondary btn-sm" onclick="closeShelfFilters()"><span class="play-tri">◀</span> Back</button>' +
      '<div class="tools-modal-title" style="font-size:1.05rem;margin:0;flex:1;text-align:center;">Filter Collection</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:0.5rem;">' +
      '<div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;font-weight:600;">Players</div>' +
      '<div style="display:flex;gap:0.3rem;">' +
      '<button class="btn-secondary btn-sm" onclick="setShelfFilter(\'players\',1)">1</button>' +
      '<button class="btn-secondary btn-sm" onclick="setShelfFilter(\'players\',2)">2</button>' +
      '<button class="btn-secondary btn-sm" onclick="setShelfFilter(\'players\',3)">3</button>' +
      '<button class="btn-secondary btn-sm" onclick="setShelfFilter(\'players\',4)">4</button>' +
      '<button class="btn-secondary btn-sm" onclick="setShelfFilter(\'players\',5)">5+</button>' +
      '</div>' +
      '<div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;font-weight:600;margin-top:0.5rem;">Type</div>' +
      '<div style="display:flex;gap:0.3rem;flex-wrap:wrap;">' +
      '<button class="btn-secondary btn-sm" onclick="setShelfFilter(\'type\',\'coop\')">🤝 Co-op</button>' +
      '<button class="btn-secondary btn-sm" onclick="setShelfFilter(\'type\',\'competitive\')">⚔️ Competitive</button>' +
      '<button class="btn-secondary btn-sm" onclick="setShelfFilter(\'type\',\'party\')">🎉 Party</button>' +
      '<button class="btn-secondary btn-sm" onclick="setShelfFilter(\'type\',\'solo\')">🧍 Solo</button>' +
      '</div>' +
      '<div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;font-weight:600;margin-top:0.5rem;">Favorites</div>' +
      '<button class="btn-secondary btn-sm" onclick="setShelfFilter(\'favorite\',true)">★ Favorites only</button>' +
      '<div style="font-size:0.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;font-weight:600;margin-top:0.5rem;">Top Games</div>' +
      '<button class="btn-secondary btn-sm" onclick="setShelfFilter(\'top\',true)">★ Top rated</button>' +
      '<button class="btn-secondary btn-sm" onclick="setShelfFilter(\'clear\',true)">Clear filters</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(filterOverlay);
  } else {
    filterOverlay.style.display = 'flex';
  }
}

window.closeShelfFilters = function() {
  var filterOverlay = document.getElementById('shelf-filter-overlay');
  if (filterOverlay) filterOverlay.style.display = 'none';
};

window.setShelfFilter = function(type, value) {
  if (!window._shelfFilters) window._shelfFilters = {};
  if (type === 'clear') {
    window._shelfFilters = {};
  } else {
    window._shelfFilters[type] = value;
  }
  var overlay = document.getElementById('shelf-filter-overlay');
  if (overlay) overlay.style.display = 'none';
  renderShelf();
};

// Expose functions on window
window.openShelfGameDetail = openShelfGameDetail;
window.closeShelfGameDetail = closeShelfGameDetail;
window.openShelfFilters = openShelfFilters;
window.clearShelfFilters = clearShelfFilters;
window.renderShelf = renderShelf;
window.closeCollectionShelf = closeCollectionShelf;
window.openCollectionShelf = openCollectionShelf;
window.pickRandomShelfGame = pickRandomShelfGame;