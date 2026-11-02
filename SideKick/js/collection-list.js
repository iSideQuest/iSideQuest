// Collection library list/filter UI. Edit, search, barcode, and photo flows remain in index.html.
import { collectionState } from './collection-store.js?v=349';

const collectionListServices = {
  escapeHtml: value => value == null ? '' : String(value),
  showAlert: message => { if (window.showAlert) window.showAlert(message); },
  openCollectionDetail: id => { if (window.openCollectionDetail) window.openCollectionDetail(id); },
};
export function configureCollectionList(services = {}) {
  Object.assign(collectionListServices, services);
}

export const COLLECTION_CATEGORIES = [
  { key: 'coop',        icon: '🤝', label: 'Co-op' },
  { key: 'competitive', icon: '⚔️', label: 'Competitive' },
  { key: 'teams',       icon: '👥', label: 'Teams' },
  { key: 'solo',        icon: '🧍', label: 'Solo' },
  { key: 'party',       icon: '🎉', label: 'Party' }
];
export const COLLECTION_MECHANICS = [
  { key: 'deck-builder',     icon: '🃏', label: 'Deck Builder' },
  { key: 'worker-placement', icon: '🧱', label: 'Worker Placement' },
  { key: 'area-control',     icon: '🗺️', label: 'Area Control' },
  { key: 'drafting',         icon: '🔄', label: 'Drafting' },
  { key: 'card-game',        icon: '🎴', label: 'Card Game' },
  { key: 'dice',             icon: '🎲', label: 'Dice' },
  { key: 'engine-building',  icon: '🏗️', label: 'Engine Building' },
  { key: 'deduction',        icon: '🕵️', label: 'Deduction' }
];
const COLLECTION_DEFS = {};
COLLECTION_CATEGORIES.forEach(c => COLLECTION_DEFS[c.key] = c);
COLLECTION_MECHANICS.forEach(m => COLLECTION_DEFS[m.key] = m);
const COLLECTION_FILTER_GROUPS = [
  { label: 'Play Style',      type: 'cat',  keys: ['coop','competitive','teams','solo','party'] },
  { label: 'Deck & Draft',    type: 'mech', keys: ['deck-builder','engine-building','drafting'] },
  { label: 'Board Strategy',  type: 'mech', keys: ['worker-placement','area-control'] },
  { label: 'Cards & Dice',    type: 'mech', keys: ['card-game','dice'] },
  { label: 'Deduction',       type: 'mech', keys: ['deduction'] }
];

let collectionFilter = { search: '', players: 0, cats: new Set(), mechs: new Set() };
let collectionPickId = null;

let collectionFiltersOpen = false;
window.toggleCollectionFilters = function() {
  collectionFiltersOpen = !collectionFiltersOpen;
  const body = document.getElementById('collection-filter-body');
  if (body) body.style.display = collectionFiltersOpen ? 'flex' : 'none';
  const arrow = document.getElementById('collection-filter-arrow');
  if (arrow) arrow.textContent = collectionFiltersOpen ? '▾' : '▸';
};
export function renderCollectionFilters() {
  const groupsEl = document.getElementById('collection-filter-groups');
  if (groupsEl) {
    groupsEl.innerHTML = COLLECTION_FILTER_GROUPS.map(group => {
      const set = group.type === 'cat' ? collectionFilter.cats : collectionFilter.mechs;
      const chips = group.keys.map(key => {
        const def = COLLECTION_DEFS[key];
        if (!def) return '';
        return '<button class="collection-chip' + (set.has(key) ? ' active' : '') + '" onclick="toggleCollectionFilter(\'' + group.type + '\',\'' + key + '\')">' + def.icon + ' ' + def.label + '</button>';
      }).join('');
      return '<div><div class="collection-filter-subtitle">' + group.label + '</div>' +
             '<div class="collection-chip-row">' + chips + '</div></div>';
    }).join('');
  }
  const playersEl = document.getElementById('collection-players');
  if (playersEl) playersEl.textContent = collectionFilter.players || 'Any';
  const countEl = document.getElementById('collection-filter-count');
  if (countEl) {
    const n = (collectionFilter.players ? 1 : 0) + collectionFilter.cats.size + collectionFilter.mechs.size;
    countEl.textContent = n ? ' (' + n + ')' : '';
  }
}

window.toggleCollectionFilter = function(type, key) {
  const set = type === 'cat' ? collectionFilter.cats : collectionFilter.mechs;
  set.has(key) ? set.delete(key) : set.add(key);
  renderCollectionFilters(); renderCollection();
};
window.collectionPlayers = function(delta) {
  collectionFilter.players = Math.max(0, Math.min(30, (collectionFilter.players || 0) + delta));
  renderCollectionFilters(); renderCollection();
};
window.clearCollectionFilters = function() {
  collectionFilter = { search: '', players: 0, cats: new Set(), mechs: new Set() };
  collectionPickId = null;
  const searchEl = document.getElementById('collection-search');
  if (searchEl) searchEl.value = '';
  renderCollectionFilters(); renderCollection();
};

window.pickRandomGame = function() {
  const searchEl = document.getElementById('collection-search');
  collectionFilter.search = (searchEl && searchEl.value || '').trim().toLowerCase();
  const matches = collectionState.games.filter(game => {
    if (collectionFilter.search && (game.name || '').toLowerCase().indexOf(collectionFilter.search) === -1) return false;
    if (collectionFilter.players) {
      const p = collectionFilter.players;
      if (game.maxPlayers && game.maxPlayers < p) return false;
      if (game.minPlayers && game.minPlayers > p) return false;
    }
    if (collectionFilter.cats.size && ![...collectionFilter.cats].some(k => (game.categories || []).indexOf(k) !== -1)) return false;
    if (collectionFilter.mechs.size && ![...collectionFilter.mechs].some(k => (game.mechanics || []).indexOf(k) !== -1)) return false;
    return true;
  });
  if (!matches.length) {
    collectionListServices.showAlert('No games match your current filters.');
    return;
  }
  collectionPickId = matches[Math.floor(Math.random() * matches.length)].id;
  renderCollection();
};

export function renderCollection() {
  const listEl = document.getElementById('collection-list');
  if (!listEl) return;
  const searchEl = document.getElementById('collection-search');
  collectionFilter.search = (searchEl && searchEl.value || '').trim().toLowerCase();
  const all = collectionState.games;
  const matches = all.filter(game => {
    if (collectionFilter.search && (game.name || '').toLowerCase().indexOf(collectionFilter.search) === -1) return false;
    if (collectionFilter.players) {
      const p = collectionFilter.players;
      if (game.maxPlayers && game.maxPlayers < p) return false;
      if (game.minPlayers && game.minPlayers > p) return false;
    }
    if (collectionFilter.cats.size && ![...collectionFilter.cats].some(k => (game.categories || []).indexOf(k) !== -1)) return false;
    if (collectionFilter.mechs.size && ![...collectionFilter.mechs].some(k => (game.mechanics || []).indexOf(k) !== -1)) return false;
    return true;
  });
  const countEl = document.getElementById('collection-count');
  if (countEl) countEl.textContent = all.length ? '(' + all.length + ')' : '';
  if (!matches.length) {
    listEl.innerHTML = all.length
      ? '<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:0.75rem 0;grid-column:1/-1;">No games match your filters.</div>'
      : '<div style="color:var(--muted);font-size:0.85rem;text-align:center;padding:1rem 0;grid-column:1/-1;">Your collection is empty.<br>Tap Add Game above to add your first game.</div>';
    return;
  }
  const ordered = [...matches];
  if (collectionPickId) {
    const idx = ordered.findIndex(g => g.id === collectionPickId);
    if (idx !== -1) {
      const picked = ordered.splice(idx, 1)[0];
      ordered.unshift(picked);
    }
  }
  listEl.innerHTML = '';
  ordered.forEach(game => {
    const row = buildCollectionGameRow(game);
    if (game.id === collectionPickId) row.classList.add('collection-pick');
    listEl.appendChild(row);
  });
}
window.renderCollection = renderCollection;

export function buildCollectionGameRow(game, opts) {
  // V2 photo-grid card (friend view reuses it read-only, without photos)
  const card = document.createElement('div');
  card.className = 'collection-game';
  const showPhoto = !opts || opts.photos !== false;
  const readOnly = !!(opts && opts.readonly);
  if (!readOnly) {
    card.style.cursor = 'pointer';
    card.onclick = () => collectionListServices.openCollectionDetail(game.id);
  }
  const ratingVal = typeof game.rating === 'number' ? game.rating : 0;
  const playersLine = (game.minPlayers && game.maxPlayers) ? '👥 ' + game.minPlayers + '-' + game.maxPlayers : '';
  const photoHtml = (showPhoto && game.photo)
    ? '<div class="collection-card-photo"><img src="' + game.photo + '" alt=""></div>'
    : '<div class="collection-card-photo collection-card-photo-empty"><span>🎲</span></div>';
  card.innerHTML =
    photoHtml +
    '<div class="collection-card-info">' +
    '<div class="collection-card-name">' + collectionListServices.escapeHtml(game.name || 'Untitled') + '</div>' +
    '<div class="collection-card-stars">' + starsHTML(ratingVal, '0.6rem') + '<span>' + formatRating(ratingVal) + '</span></div>' +
    (playersLine ? '<div class="collection-card-meta">' + playersLine + '</div>' : '') +
    '</div>';
  return card;
}

// 0–10 star rating (half steps) with numeric value
export function starsHTML(rating, size) {
  const r = typeof rating === 'number' ? Math.max(0, Math.min(10, rating)) : 0;
  let out = '<span style="display:inline-flex;gap:0.08rem;font-size:' + (size || '0.9rem') + ';line-height:1;">';
  for (let i = 1; i <= 10; i++) {
    const fill = Math.min(1, Math.max(0, r - (i - 1)));
    out += '<span style="position:relative;display:inline-block;color:rgba(255,255,255,0.18);">★<span style="position:absolute;left:0;top:0;width:' + (fill * 100) + '%;overflow:hidden;color:#fbbf24;white-space:nowrap;">★</span></span>';
  }
  return out + '</span>';
}
export function formatRating(r) {
  if (typeof r !== 'number' || r <= 0) return '–';
  return String(Math.round(r * 2) / 2);
}
