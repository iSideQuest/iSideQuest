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
let dragState = null; // { gameId, ghostEl, targetId }
let longPressTimer = null;
let shelfReturn = false;

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
  const filtered = query ? games.filter(function(g) { return (g.name || '').toLowerCase().indexOf(query) !== -1; }) : games;
  const countEl = document.getElementById('shelf-count');
  if (countEl) countEl.textContent = games.length ? '(' + games.length + ')' : '';
  if (!filtered.length) {
    container.innerHTML = '<div class="shelf-empty">' + (games.length ? 'No games match your search.' : 'Your collection is empty.<br>Add games from My Collection first.') + '</div>';
    return;
  }
  const perRow = 7;
  const rows = [];
  for (let i = 0; i < filtered.length; i += perRow) {
    rows.push(filtered.slice(i, i + perRow));
  }
  const colors = ['#4a6fa5','#6a8f5a','#a56a4a','#8a5a8f','#5a8fa5','#a5a55a','#a55a6a','#5a5a8f'];
  container.innerHTML = '<div class="shelf-unit">' + rows.map(function(row, ri) {
    return '<div class="shelf-row">' + row.map(function(g, gi) {
      const color = colors[(ri * perRow + gi) % colors.length];
      const name = (g.name || 'Untitled');
      const photo = g.photo ? '<img class="shelf-game-photo" src="' + g.photo + '" alt="">' : '';
      const spine = !g.photo ? '<div class="shelf-game-spine">' + name + '</div>' : '';
      return '<div class="shelf-game" style="background:' + color + ';" data-game-id="' + g.id + '" title="' + name + '">' + photo + spine + '</div>';
    }).join('') + '</div>';
  }).join('') + '</div>';
  // Add event handlers
  container.querySelectorAll('.shelf-game').forEach(function(el) {
    const gameId = el.getAttribute('data-game-id');
    // Pointer down - start long-press timer
    el.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      longPressTimer = setTimeout(function() {
        startDrag(gameId, el, e);
      }, 500);
    });
    el.addEventListener('pointerup', function(e) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      if (dragState && dragState.dragging) {
        // Drop handled by global pointerup
      } else if (!dragState) {
        // Quick tap -> show details
        openShelfGameDetail(gameId);
      }
    });
    el.addEventListener('pointerleave', function() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    });
    el.addEventListener('contextmenu', function(e) {
      e.preventDefault();
    });
  });
  // Global pointer move for drag
  document.addEventListener('pointermove', onPointerMove, { passive: false });
  document.addEventListener('pointerup', onPointerUp, { passive: false });
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
  ghost.style.opacity = '0.85';
  ghost.style.transform = 'scale(1.15)';
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
  dragState.ghost.style.left = (e.clientX - dragState.ghost.offsetWidth / 2) + 'px';
  dragState.ghost.style.top = (e.clientY - dragState.ghost.offsetHeight / 2) + 'px';
  // Highlight target
  document.querySelectorAll('.shelf-game').forEach(function(el) {
    el.classList.remove('shelf-drag-target');
  });
  const target = document.elementFromPoint(e.clientX, e.clientY);
  const targetGame = target ? target.closest('.shelf-game') : null;
  if (targetGame && targetGame.getAttribute('data-game-id') !== dragState.gameId) {
    targetGame.classList.add('shelf-drag-target');
    dragState.targetId = targetGame.getAttribute('data-game-id');
  } else if (!targetGame) {
    dragState.targetId = null;
  }
}

function onPointerUp(e) {
  if (!dragState) return;
  if (dragState.ghost) {
    dragState.ghost.remove();
  }
  // Clean up
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
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
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
  shelfReturn = true;
  window._shelfReturn = true;
  var co = document.getElementById('collection-overlay');
  if (co) co.style.display = 'flex';
  if (window.openCollectionDetail) window.openCollectionDetail(id);
}

export function clearShelfFilters() {
  const searchEl = document.getElementById('shelf-search');
  if (searchEl) searchEl.value = '';
  renderShelf();
}

// Expose shelfReturn check for closeCollectionDetail
window._shelfReturn = false;
window.closeCollectionDetailFromShelf = function() {
  shelfReturn = false;
  document.getElementById('collection-detail').style.display = 'none';
  if (window.showScreen) window.showScreen('collection-shelf');
  renderShelf();
};