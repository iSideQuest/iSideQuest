import { collectionState, loadCollection, saveCollectionLocal } from './collection-store.js?v=352';

const shelfServices = {
  showAlert: (msg) => { if (window.showAlert) window.showAlert(msg); },
  haptic: () => {},
  openCollectionDetail: (id) => { if (window.openCollectionDetail) window.openCollectionDetail(id); },
};

export function configureShelf(services = {}) {
  Object.assign(shelfServices, services);
}

// Drag state
let moveModeGameId = null;
let longPressTimer = null;
let longPressTarget = null;

export function openCollectionShelf() {
  if (window.showScreen) window.showScreen('collection-shelf');
  requestAnimationFrame(function() {
    loadCollection().then(function() { renderShelf(); }).catch(function() { renderShelf(); });
  });
}

export function closeCollectionShelf() {
  if (window.showScreen) window.showScreen('profile');
  cancelMoveMode();
}

export function renderShelf() {
  const container = document.getElementById('shelf-container');
  if (!container) return;
  const searchEl = document.getElementById('shelf-search');
  const query = (searchEl && searchEl.value || '').trim().toLowerCase();
  const games = (collectionState && collectionState.games) ? collectionState.games : [];
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
      const isMoving = (moveModeGameId === g.id) ? ' shelf-game-moving' : '';
      return '<div class="shelf-game' + isMoving + '" style="background:' + color + ';" data-game-id="' + g.id + '" title="' + name + '">' + photo + spine + '</div>';
    }).join('') + '</div>';
  }).join('') + '</div>';
  // Add event handlers
  container.querySelectorAll('.shelf-game').forEach(function(el) {
    const gameId = el.getAttribute('data-game-id');
    // Long press to enter move mode
    el.addEventListener('pointerdown', function(e) {
      longPressTarget = gameId;
      longPressTimer = setTimeout(function() {
        enterMoveMode(gameId);
      }, 500);
    });
    el.addEventListener('pointerup', function(e) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      if (moveModeGameId && moveModeGameId !== gameId) {
        // Swap games
        swapGames(moveModeGameId, gameId);
        cancelMoveMode();
      } else if (moveModeGameId === gameId) {
        // Tapping same game cancels move mode
        cancelMoveMode();
      } else if (!moveModeGameId && longPressTarget === gameId) {
        // Quick tap (not long press) -> show details
        openShelfGameDetail(gameId);
      }
      longPressTarget = null;
    });
    el.addEventListener('pointerleave', function() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      longPressTarget = null;
    });
    el.addEventListener('contextmenu', function(e) {
      e.preventDefault();
    });
  });
}

function enterMoveMode(gameId) {
  moveModeGameId = gameId;
  if (shelfServices.haptic) try { shelfServices.haptic(10); } catch {}
  renderShelf();
}

function cancelMoveMode() {
  moveModeGameId = null;
  renderShelf();
}

function swapGames(id1, id2) {
  const games = collectionState.games;
  const idx1 = games.findIndex(function(g) { return g.id === id1; });
  const idx2 = games.findIndex(function(g) { return g.id === id2; });
  if (idx1 < 0 || idx2 < 0 || idx1 === idx2) return;
  // Swap
  const tmp = games[idx1];
  games[idx1] = games[idx2];
  games[idx2] = tmp;
  saveCollectionLocal(games);
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
  if (window.openCollectionDetail) window.openCollectionDetail(id);
}

export function clearShelfFilters() {
  const searchEl = document.getElementById('shelf-search');
  if (searchEl) searchEl.value = '';
  renderShelf();
}
